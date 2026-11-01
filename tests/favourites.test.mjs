import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFavouritesStore, filterPrompts } from '../core.js';
const prompts = JSON.parse(await readFile(new URL('../prompts.json',import.meta.url),'utf8'));
const storage = () => {
  const data = new Map();
  return { getItem:key=>data.get(key) ?? null, setItem:(key,value)=>data.set(key,value) };
};
test('favourites persist by stable ID and remain separate for different site paths', () => {
  const db=storage(), first=createFavouritesStore(()=>db,'/library/');
  assert.deepEqual(first.toggle(prompts[0].id),{saved:true,persistent:true});
  const reload=createFavouritesStore(()=>db,'/library/');
  assert.ok(reload.has(prompts[0].id));
  const renamed={...prompts[0],title:'A renamed prompt'};
  assert.equal(filterPrompts([renamed],{view:'favourites'},reload.ids)[0].title,renamed.title);
  assert.equal(createFavouritesStore(()=>db,'/another-library/').ids.size,0);
  assert.deepEqual(reload.toggle(prompts[0].id),{saved:false,persistent:true});
  assert.equal(createFavouritesStore(()=>db,'/library/').ids.size,0);
});
test('favourites combine with search and filters while ignoring missing catalogue entries', () => {
  const ids = new Set([prompts[0].id,'removed-prompt']);
  assert.equal(filterPrompts(prompts,{view:'favourites'},ids).length,1);
  assert.equal(filterPrompts(prompts,{view:'favourites',query:prompts[0].author,tier:'Basic',effort:'Auto',category:prompts[0].category},ids).length,1);
  assert.equal(filterPrompts(prompts,{view:'favourites',tier:'Premium'},ids).length,0);
  assert.equal(filterPrompts(prompts,{view:'favourites',query:'nonexistentterm'},ids).length,0);
  assert.equal(filterPrompts(prompts,{view:'favourites'},new Set()).length,0);
  assert.equal(filterPrompts(prompts,{},ids).length,12);
});
test('corrupt or unexpected saved data is recoverable and never enters the catalogue', () => {
  const db=storage();
  for(const raw of ['{broken','null','{}','42','"not-a-list"']) {
    db.setItem('test',raw);
    const store=createFavouritesStore(()=>db,'test');
    assert.equal(store.ids.size,0);
    store.toggle('valid-prompt');
    assert.deepEqual(JSON.parse(db.getItem('test')),['valid-prompt']);
  }
  db.setItem('test',JSON.stringify(['valid-prompt','valid-prompt',null,42,{},'<img src=x>','Bad ID','another-prompt']));
  const store=createFavouritesStore(()=>db,'test');
  assert.deepEqual([...store.ids],['valid-prompt','another-prompt']);
  assert.throws(()=>store.toggle('<script>'),TypeError);
  const copy=store.ids; copy.clear(); assert.equal(store.ids.size,2);
});
test('unavailable or full storage keeps changes in memory and reports persistence failure', () => {
  const blocked=createFavouritesStore(()=>{throw new Error('blocked');},'test');
  assert.equal(blocked.persistent,false);
  assert.deepEqual(blocked.toggle('one'),{saved:true,persistent:false});
  blocked.toggle('two'); assert.deepEqual([...blocked.ids],['one','two']);
  blocked.toggle('one'); assert.deepEqual([...blocked.ids],['two']);
  const db={getItem:()=> '["existing"]',setItem:()=>{throw new Error('quota');}};
  const full=createFavouritesStore(()=>db,'test');
  full.toggle('new'); full.toggle('second');
  assert.deepEqual([...full.ids],['existing','new','second']);
  assert.equal(full.persistent,false);
});
test('other tabs recent saves are retained and storage updates or clears are reflected', () => {
  const db=storage(), a=createFavouritesStore(()=>db,'test'), b=createFavouritesStore(()=>db,'test');
  a.toggle('one'); b.toggle('two');
  assert.deepEqual([...b.ids],['one','two']);
  a.sync(db.getItem('test')); assert.deepEqual([...a.ids],['one','two']);
  a.toggle('one'); b.sync(db.getItem('test')); assert.deepEqual([...b.ids],['two']);
  b.sync(null); assert.equal(b.ids.size,0);
});

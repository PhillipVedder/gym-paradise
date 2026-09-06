import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,CATALOG,MAX_ITEMS,bounds,canPlace,freeSpot,validateLayout,walkable} from '../lib/gym-data.ts';

test('starter gym imports successfully and leaves the entrance walkable',()=>{
 const layout=validateLayout(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));
 assert.equal(layout.items.length,15);
 assert.ok(walkable(1.7,-9,layout.items));
 assert.notEqual(layout,DEFAULT_LAYOUT);
});
test('every equipment type can be added to the starter room without overlap',()=>{
 for(const equipment of CATALOG){const item=freeSpot(equipment.kind,DEFAULT_LAYOUT.items);assert.ok(item,equipment.kind);assert.ok(canPlace(item,DEFAULT_LAYOUT.items));}
});
test('rotation updates the footprint and room boundaries apply to the whole machine',()=>{
 const rack={id:'rack',kind:'dumbbells',x:0,z:0,rotation:0};
 assert.equal(bounds(rack).x,1.9);
 assert.ok(Math.abs(bounds({...rack,rotation:Math.PI/2}).z-1.9)<1e-10);
 assert.equal(canPlace({...rack,x:10},[]),false);
 assert.equal(canPlace({...rack,z:12.7},[]),false);
});
test('moving ignores the item itself but rejects overlaps and respects clearance',()=>{
 const bench={id:'bench',kind:'bench',x:0,z:0,rotation:0};
 assert.ok(canPlace(bench,[bench]));
 assert.equal(canPlace({...bench,id:'other'},[bench]),false);
 assert.equal(canPlace({...bench,id:'other',x:1},[bench]),false);
 assert.ok(canPlace({...bench,id:'other',x:1.2},[bench]));
});
test('walking cannot pass through equipment or leave the room',()=>{
 const bench={id:'bench',kind:'bench',x:0,z:0,rotation:0};
 assert.equal(walkable(0,0,[bench]),false);
 assert.equal(walkable(10.8,0,[]),false);
 assert.ok(walkable(3,3,[bench]));
});
test('invalid and hostile imports are rejected before replacing a gym',()=>{
 const original=JSON.stringify(DEFAULT_LAYOUT);
 for(const mutation of [d=>{d.version=2;},d=>{d.items[0].x=NaN;},d=>{d.items[0].x=100;},d=>{d.items[0].kind='__proto__';},d=>{d.items[1].id=d.items[0].id;},d=>{d.name='';},d=>{d.items[1]={...d.items[0],id:'overlap'};},d=>{d.items=Array.from({length:MAX_ITEMS+1},()=>d.items[0]);}]){
  const draft=JSON.parse(original);mutation(draft);assert.throws(()=>validateLayout(draft));
 }
 assert.equal(JSON.stringify(DEFAULT_LAYOUT),original);
});
test('layout imports discard unknown fields and preserve an empty gym',()=>{
 const parsed=validateLayout({...DEFAULT_LAYOUT,items:[],secret:'unused'});
 assert.equal(parsed.items.length,0);assert.equal('secret' in parsed,false);
});
test('catalogue capacity is bounded',()=>{
 assert.equal(freeSpot('bench',Array.from({length:MAX_ITEMS},()=>DEFAULT_LAYOUT.items[0])),null);
});

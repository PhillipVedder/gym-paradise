export type EquipmentKind = 'bench' | 'rack' | 'cable' | 'chest' | 'legpress' | 'pulldown' | 'row' | 'dumbbells';
export type Mode = 'build' | 'explore';
export type Category = 'All equipment' | 'Machines' | 'Cables' | 'Free weights';
export type Equipment = { kind: EquipmentKind; name: string; category: Category; width: number; depth: number; detail: string; tag: string };
export type PlacedItem = { id: string; kind: EquipmentKind; x: number; z: number; rotation: number };
export type GymLayout = { version: 1; name: string; items: PlacedItem[]; lighting: 'violet' | 'cyan' | 'warm'; mural: boolean };
export const ROOM = { width: 22, depth: 26 };
export const MAX_ITEMS = 40;
export const CATALOG: Equipment[] = [
  {kind:'chest',name:'Plate-loaded chest press',category:'Machines',width:2.3,depth:2.3,detail:'Independent arms · plate-loaded',tag:'PUSH'},
  {kind:'cable',name:'Dual cable station',category:'Cables',width:3.5,depth:1.3,detail:'Adjustable pulleys · dual stack',tag:'CABLES'},
  {kind:'bench',name:'Adjustable bench',category:'Free weights',width:0.9,depth:1.8,detail:'Incline backrest · free weights',tag:'ESSENTIAL'},
  {kind:'rack',name:'Power rack',category:'Free weights',width:2.0,depth:1.9,detail:'Barbell · safety rails · plate storage',tag:'STRENGTH'},
  {kind:'legpress',name:'45° leg press',category:'Machines',width:2.1,depth:2.8,detail:'Angled rails · plate-loaded',tag:'LEGS'},
  {kind:'pulldown',name:'Lat pulldown',category:'Machines',width:1.6,depth:2.0,detail:'Weight stack · wide grip bar',tag:'PULL'},
  {kind:'row',name:'Seated row',category:'Machines',width:1.6,depth:2.0,detail:'Chest support · plate-loaded',tag:'PULL'},
  {kind:'dumbbells',name:'Dumbbell rack',category:'Free weights',width:3.8,depth:0.9,detail:'Two-tier rack · paired dumbbells',tag:'ESSENTIAL'},
];
export const EQUIPMENT = Object.fromEntries(CATALOG.map(e=>[e.kind,e])) as Record<EquipmentKind,Equipment>;
export const DEFAULT_LAYOUT: GymLayout = {version:1,name:'My dream gym',lighting:'violet',mural:true,items:[
  {id:'rack-1',kind:'rack',x:-8,z:6,rotation:0},
  {id:'rack-2',kind:'rack',x:-5,z:6,rotation:0},
  {id:'cable-1',kind:'cable',x:1.5,z:9,rotation:0},
  {id:'cable-2',kind:'cable',x:7,z:9,rotation:0},
  {id:'db-1',kind:'dumbbells',x:-6.5,z:11.7,rotation:0},
  {id:'db-2',kind:'dumbbells',x:-2.2,z:11.7,rotation:0},
  {id:'bench-1',kind:'bench',x:-6.5,z:8.7,rotation:0},
  {id:'bench-2',kind:'bench',x:-2.6,z:8.7,rotation:0},
  {id:'bench-3',kind:'bench',x:-8,z:0.6,rotation:0},
  {id:'chest-1',kind:'chest',x:-3.8,z:1.2,rotation:0},
  {id:'chest-2',kind:'chest',x:-3.8,z:-3.5,rotation:Math.PI},
  {id:'leg-1',kind:'legpress',x:6.6,z:3.6,rotation:0},
  {id:'leg-2',kind:'legpress',x:6.6,z:-1.3,rotation:0},
  {id:'pull-1',kind:'pulldown',x:7,z:-7,rotation:Math.PI},
  {id:'row-1',kind:'row',x:-6.8,z:-6.7,rotation:Math.PI},
]};
export function bounds(item: PlacedItem, padding=0) {
  const e=EQUIPMENT[item.kind];
  const s=Math.abs(Math.sin(item.rotation)),c=Math.abs(Math.cos(item.rotation));
  return { x:e.width*c/2+e.depth*s/2+padding,z:e.depth*c/2+e.width*s/2+padding };
}
export function canPlace(item: PlacedItem, items: PlacedItem[]) {
  const a=bounds(item,0.12);
  if(Math.abs(item.x)+a.x>ROOM.width/2-0.3 || Math.abs(item.z)+a.z>ROOM.depth/2-0.3)return false;
  return !items.some(other=>{
    if(other.id===item.id)return false;
    const b=bounds(other,0.12);
    return Math.abs(item.x-other.x)<a.x+b.x && Math.abs(item.z-other.z)<a.z+b.z;
  });
}
export function freeSpot(kind: EquipmentKind, items: PlacedItem[]): PlacedItem|null {
  if(items.length>=MAX_ITEMS)return null;
  const draft={id:`item-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,kind,x:0,z:0,rotation:0};
  for(let z=-5;z<12;z+=1.5)for(let x=-8;x<10;x+=1.5){
    const candidate={...draft,x,z};if(canPlace(candidate,items))return candidate;
  }
  for(let z=-11;z<12;z+=1)for(let x=-9;x<10;x+=1){
    const candidate={...draft,x,z};if(canPlace(candidate,items))return candidate;
  }
  return null;
}
export function walkable(x:number,z:number,items:PlacedItem[]) {
  if(Math.abs(x)>ROOM.width/2-0.45 || Math.abs(z)>ROOM.depth/2-0.45)return false;
  return !items.some(item=>{const b=bounds(item,0.3);return Math.abs(x-item.x)<b.x && Math.abs(z-item.z)<b.z;});
}
export function validateLayout(value:unknown):GymLayout {
  if(!value || typeof value!=='object')throw new Error('Choose a Gym Paradise layout file.');
  const d=value as GymLayout;
  if(d.version!==1 || !Array.isArray(d.items) || d.items.length>MAX_ITEMS || typeof d.name!=='string' || !d.name.trim() || d.name.length>60 || !['violet','cyan','warm'].includes(d.lighting) || typeof d.mural!=='boolean')throw new Error('This layout file is not supported.');
  const ids=new Set<string>();
  const items:PlacedItem[]=[];
  for(const item of d.items){
    if(!item || typeof item.id!=='string' || !item.id || item.id.length>100 || ids.has(item.id) || !Object.hasOwn(EQUIPMENT,item.kind) || ![item.x,item.z,item.rotation].every(n=>typeof n==='number' && Number.isFinite(n)) || Math.abs(item.rotation)>Math.PI*8)throw new Error('This file contains invalid equipment.');
    const clean={id:item.id,kind:item.kind,x:item.x,z:item.z,rotation:item.rotation};
    if(!canPlace(clean,items))throw new Error('This layout has overlapping equipment or items outside the room.');
    ids.add(item.id);items.push(clean);
  }
  return {version:1,name:d.name.trim(),lighting:d.lighting,mural:d.mural,items};
}

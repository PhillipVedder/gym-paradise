import { Engine, Scene, Color3, Color4, Vector3, Quaternion, MeshBuilder, Mesh, StandardMaterial, DynamicTexture, Texture, ArcRotateCamera, UniversalCamera, HemisphericLight, DirectionalLight, PointLight, TransformNode, GlowLayer, MirrorTexture, Plane } from '@babylonjs/core';
import { EQUIPMENT, ROOM, canPlace, walkable, type EquipmentKind, type GymLayout, type Mode } from './gym-data';
type Callbacks={onSelect:(id:string|null)=>void;onMove:(id:string,x:number,z:number)=>void;onReady:()=>void};
export type GymSceneApi=ReturnType<typeof createGymScene>;

export function createGymScene(canvas:HTMLCanvasElement,callbacks:Callbacks){
 const coarse=matchMedia('(pointer: coarse)').matches;
 const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance'},false);
 engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/(coarse?1.35:1.7)));
 const scene=new Scene(engine);scene.clearColor=new Color4(.07,.08,.095,1);
 scene.ambientColor=new Color3(.3,.3,.35);scene.imageProcessingConfiguration.exposure=1.25;scene.imageProcessingConfiguration.contrast=1.15;
 const hemi=new HemisphericLight('ceiling fill',new Vector3(0,1,0),scene);hemi.intensity=1.15;hemi.groundColor=new Color3(.25,.24,.3);
 const key=new DirectionalLight('soft daylight',new Vector3(-.4,-1,.5),scene);key.intensity=1.8;
 const rim=new PointLight('violet wash',new Vector3(0,4,10),scene);rim.diffuse=new Color3(.65,.3,1);rim.intensity=1.4;rim.range=20;
 const cool=new PointLight('cyan wash',new Vector3(8,4,-5),scene);cool.diffuse=new Color3(.15,.8,1);cool.intensity=.8;cool.range=16;
 const glow=new GlowLayer('light bloom',scene,{blurKernelSize:32,mainTextureRatio:coarse?.25:.4});glow.intensity=.38;
 const material=(name:string,color:string,spec=.12,emission?:string)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(spec,spec,spec);if(emission)m.emissiveColor=Color3.FromHexString(emission);return m;};
 const steel=material('powder coated graphite','#303740',.45),rubber=material('upholstery','#101319',.12),silver=material('brushed steel','#9da7ae',.8),plates=material('rubber plates','#191c22',.15),yellow=material('adjustment handles','#c4ad58',.4);
 const wall=material('charcoal walls','#303139',.12),trim=material('roof structure','#1b2027',.3),white=material('white light','#d8e5ec',0,'#b6c7d1');
 const violet=material('violet light','#b477ed',0,'#ad4aff');const cyan=material('cyan light','#73dee9',0,'#30a8bb');const turfmat=material('violet turf','#422364',.05);
 const muralmat=new StandardMaterial('original mural',scene);muralmat.diffuseTexture=new Texture('/art/paradise-mural.png',scene);muralmat.emissiveColor=new Color3(.38,.38,.38);muralmat.specularColor=Color3.Black();
 const floorMat=material('rubber flooring','#d0d1d6',.08);
 const noise=new DynamicTexture('rubber grain',{width:256,height:256},scene,false);const ctx=noise.getContext();let seed=317;for(let y=0;y<256;y++)for(let x=0;x<256;x++){seed=(seed*16807)%2147483647;const n=48+(seed%21);ctx.fillStyle=`rgb(${n},${n+1},${n+4})`;ctx.fillRect(x,y,1,1);}noise.update();noise.uScale=18;noise.vScale=22;floorMat.diffuseTexture=noise;
 const floor=MeshBuilder.CreateGround('gym floor',{width:ROOM.width,height:ROOM.depth},scene);floor.material=floorMat;
 const objects=new Map<string,TransformNode>();let layout:GymLayout;let mode:Mode='build';let selected:string|null=null;
 const box=(name:string,size:number[],pos:number[],mat:StandardMaterial,parent?:TransformNode)=>{const m=MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.set(pos[0],pos[1],pos[2]);m.material=mat;if(parent)m.parent=parent;return m;};
 const beam=(name:string,a:number[],b:number[],width:number,mat:StandardMaterial,parent?:TransformNode,round=false)=>{const av=Vector3.FromArray(a),bv=Vector3.FromArray(b);const dir=bv.subtract(av);const mesh=round?MeshBuilder.CreateCylinder(name,{height:dir.length(),diameter:width,tessellation:12},scene):MeshBuilder.CreateBox(name,{width,height:dir.length(),depth:width},scene);mesh.position.copyFrom(av.add(bv).scale(.5));dir.normalize();const dot=Vector3.Dot(Vector3.Up(),dir);if(dot<.9999){const axis=dot<-.9999?Vector3.Right():Vector3.Cross(Vector3.Up(),dir).normalize();mesh.rotationQuaternion=Quaternion.RotationAxis(axis,Math.acos(Math.max(-1,Math.min(1,dot))));}mesh.material=mat;if(parent)mesh.parent=parent;return mesh;};
 const plate=(pos:number[],diameter:number,thickness:number,parent:TransformNode,axis:'x'|'z'='x')=>{const m=MeshBuilder.CreateCylinder('weight plate',{height:thickness,diameter,tessellation:20},scene);m.position.set(...pos as [number,number,number]);if(axis==='x')m.rotation.z=Math.PI/2;else m.rotation.x=Math.PI/2;m.material=plates;m.parent=parent;const cap=MeshBuilder.CreateCylinder('plate hub',{height:thickness+.015,diameter:diameter*.23,tessellation:12},scene);cap.position.copyFrom(m.position);cap.rotation.copyFrom(m.rotation);cap.material=silver;cap.parent=parent;};
 function equipment(kind:EquipmentKind,id:string){
  const root=new TransformNode(id,scene);root.metadata={kind};const b=(size:number[],p:number[],m=steel)=>box('frame',size,p,m,root);const bar=(a:number[],v:number[],w=.09,m=steel,round=false)=>beam('support',a,v,w,m,root,round);
  const seat=(y=.65,z=-.35)=>{b([.53,.16,.65],[0,y,z],rubber);bar([0,.15,z],[0,y,z],.12);};
  const stack=(x:number,z:number,height=1.8)=>{b([.5,height,.25],[x,height/2+.12,z],steel);for(let y=.28;y<height-.2;y+=.1)b([.47,.072,.32],[x,y,z],plates);for(const side of [-1,1])bar([x+side*.29,.12,z],[x+side*.29,height+.2,z],.036,silver,true);b([.09,.04,.12],[x,height*.5,z-.22],yellow);};
  if(kind==='bench'){
   bar([0,.17,-.72],[0,.17,.66],.13);bar([-.4,.12,-.6],[.4,.12,-.6],.12);bar([-.4,.12,.6],[.4,.12,.6],.12);seat(.5,-.53);const back=b([.47,.15,1.0],[0,.75,.12],rubber);back.rotation.x=-.55;bar([0,.2,.45],[0,.9,.43],.1);b([.18,.05,.1],[.18,.45,-.32],yellow);
  } else if(kind==='rack'){
   for(const x of [-.86,.86])for(const z of [-.76,.76]){b([.11,2.65,.11],[x,1.35,z]);b([.3,.06,.28],[x,.06,z]);for(let y=.65;y<2.2;y+=.15)b([.015,.036,.045],[x+.065,y,z],silver);}
   for(const z of [-.76,.76])bar([-.86,2.64,z],[.86,2.64,z],.1);for(const x of [-.86,.86]){bar([x,.48,-.8],[x,.48,.8],.075,silver);bar([x,2.65,-.76],[x,2.65,.76],.1);}
   bar([-1,1.65,-.2],[1,1.65,-.2],.05,silver,true);for(const x of [-.86,.86]){plate([x,1.65,-.2],.49,.11,root);plate([x,1.65,-.2],.35,.16,root);}
  } else if(kind==='dumbbells'){
   for(const x of [-1.65,1.65]){bar([x,.08,-.28],[x,1.02,.25],.08);bar([x,.08,.33],[x,.75,-.2],.08);b([.5,.05,.8],[x,.04,0]);}
   for(const y of [.53,.96]){const z=y>.7?.16:-.17;b([3.7,.06,.38],[0,y,z]);for(let i=0;i<9;i++){const x=-1.58+i*.395;bar([x,y+.12,z-.2],[x,y+.12,z+.2],.04,silver,true);plate([x,y+.12,z-.17],.16+i*.014,.1,root,'z');plate([x,y+.12,z+.17],.16+i*.014,.1,root,'z');}}
  } else if(kind==='cable'){
   for(const x of [-1.45,1.45]){b([.65,.1,1.15],[x,.1,0]);stack(x,.22,2.1);bar([x,0,-.42],[x,2.5,-.42],.09);bar([x,2.5,-.42],[x,2.5,.4],.09);bar([x,2.26,-.4],[x,1.3,-.55],.018,silver,true);b([.17,.14,.18],[x,1.5,-.46],yellow);bar([x-.12,1.15,-.57],[x+.12,1.15,-.57],.04,rubber,true);}
   bar([-1.5,2.5,-.35],[1.5,2.5,-.35],.13);bar([-.55,2.44,-.43],[.55,2.44,-.43],.04,silver,true);
  } else if(kind==='legpress'){
   for(const x of [-.8,.8]){bar([x,.13,-1.2],[x,.13,1.2],.15);bar([x,.23,-.8],[x,1.8,1.1],.075,silver,true);bar([x,.14,1.1],[x,1.8,1.1],.1);}
   seat(.43,-.85);const back=b([.62,.13,.83],[0,.64,-.7],rubber);back.rotation.x=-.68;const sled=b([1.15,.13,.72],[0,1.18,.27],steel);sled.rotation.x=-.68;bar([-1,1.05,.3],[1,1.05,.3],.06,silver,true);for(const x of [-.89,.89]){plate([x,1.05,.3],.55,.17,root);plate([x,1.05,.3],.42,.23,root);}
  } else {
   b([1.35,.13,1.55],[0,.12,0]);seat(.65,-.38);
   if(kind==='pulldown'){
    stack(0,.69,1.65);for(const x of [-.48,.48])bar([x,.16,.66],[x,2.5,.66],.09);bar([0,2.5,.7],[0,2.5,-.2],.12);bar([0,2.5,-.2],[0,2.1,-.2],.016,silver,true);bar([-.65,2,-.2],[0,2.13,-.2],.036,silver,true);bar([0,2.13,-.2],[.65,2,-.2],.036,silver,true);bar([-.35,.9,-.38],[.35,.9,-.38],.16,rubber,true);
   }else if(kind==='chest'){
    const back=b([.5,.15,.98],[0,1.12,.27],rubber);back.rotation.x=-1.35;
    for(const side of [-1,1]){bar([side*.72,.15,.75],[side*.72,1.95,.5],.12);bar([side*.72,1.9,.5],[side*.87,1.05,-.65],.095);bar([side*.87,1.05,-.65],[side*.4,1.05,-.65],.04,silver,true);bar([side*.4,.93,-.65],[side*.4,1.16,-.65],.055,rubber,true);bar([side*.6,1.3,.3],[side*1.05,1.3,.3],.05,silver,true);plate([side*.99,1.3,.3],.5,.12,root);}
    bar([-.72,1.92,.5],[.72,1.92,.5],.1);
   }else{
    const chest=b([.5,.14,.55],[0,1.14,.02],rubber);chest.rotation.x=.4;
    for(const side of [-1,1]){bar([side*.6,.16,.6],[side*.6,1.55,.6],.12);bar([side*.6,1.5,.6],[side*.6,.9,-.47],.09);bar([side*.6,.9,-.47],[side*.25,.9,-.47],.045,silver,true);plate([side*.67,.75,.45],.45,.12,root);}
   }
  }
  const pieces=root.getChildMeshes() as Mesh[];const groups=new Map<StandardMaterial,Mesh[]>();for(const m of pieces){const mat=m.material as StandardMaterial;if(!groups.has(mat))groups.set(mat,[]);groups.get(mat)!.push(m);}
  for(const parts of groups.values()){const merged=Mesh.MergeMeshes(parts,true,true);if(merged){merged.parent=root;merged.metadata={itemId:id};}}
  const e=EQUIPMENT[kind];const shadowMat=material('equipment contact shade','#07080a',0);shadowMat.alpha=.33;const shade=box('contact shade',[e.width,.006,e.depth],[0,.014,0],shadowMat,root);shade.isPickable=false;
  return root;
 }
 // A three-sided room becomes a cutaway in Build. Ceiling structures appear in Explore.
 const room=new TransformNode('room',scene);const ceiling=new TransformNode('ceiling',scene);
 box('back wall',[22,.2,26],[0,-.18,0],trim,room);
 box('mural wall',[22,6,.2],[0,3,13.08],wall,room);
 box('left wall',[.2,6,26],[-11.08,3,0],wall,room);
 box('entry wall',[22,6,.2],[0,3,-13.08],wall,ceiling);
 box('right wall',[.2,6,26],[11.08,3,0],wall,ceiling);
 const murals:Mesh[]=[];
 const mural=MeshBuilder.CreatePlane('athlete mural',{width:21.7,height:3.15,sideOrientation:Mesh.DOUBLESIDE},scene);mural.position.set(0,4.2,12.94);mural.material=muralmat;murals.push(mural);
 const mirrorMat=new StandardMaterial('mirror',scene);mirrorMat.diffuseColor=new Color3(.1,.12,.16);mirrorMat.specularColor=new Color3(.4,.4,.4);
 const mirrorTexture=new MirrorTexture('gym reflection',coarse?256:512,scene,true);mirrorTexture.mirrorPlane=new Plane(0,0,-1,12.83);mirrorTexture.level=.72;mirrorTexture.refreshRate=coarse?4:2;mirrorMat.reflectionTexture=mirrorTexture;
 for(let i=0;i<11;i++)box('mirror panel',[1.96,2.45,.035],[-10+i*2,1.35,12.85],mirrorMat,room);
 box('mirror light',[21.8,.035,.06],[0,.12,12.79],violet,room);box('mural light',[21.8,.045,.08],[0,2.68,12.78],violet,room);
 box('turf lane',[2,.013,23],[1.7,.012,-.3],turfmat,room);
 for(let z=-11;z<12;z+=1){box('lane marking',[.25,.005,.035],[.87,.024,z],white,room);box('lane marking',[.25,.005,.035],[2.53,.024,z],white,room);}
 for(let x=-11;x<=11;x+=2)box('floor seam',[.018,.003,26],[x,.004,0],trim,room);
 for(let z=-13;z<=13;z+=2)box('floor seam',[22,.003,.018],[0,.004,z],trim,room);
 box('industrial ceiling',[22,.12,26],[0,6.15,0],wall,ceiling);
 for(let z=-12;z<13;z+=4){box('roof beam',[22,.24,.16],[0,5.85,z],trim,ceiling);box('neutral ceiling strip',[19,.025,.045],[0,5.68,z+.25],white,ceiling);}
 for(const x of [-7,0,7]){box('longitudinal beam',[.15,.23,26],[x,5.85,0],trim,ceiling);for(const z of [-7,3]){box('led frame',[4.6,.04,.055],[x,5.35,z],x===0?cyan:violet,ceiling);box('led frame',[4.6,.04,.055],[x,5.35,z+5],x===0?cyan:violet,ceiling);for(const dx of [-2.3,2.3])box('led frame',[.055,.04,5],[x+dx,5.35,z+2.5],x===0?cyan:violet,ceiling);}}
 ceiling.setEnabled(false);
 for(const m of [...room.getChildMeshes(),...ceiling.getChildMeshes(),...murals])m.isPickable=false;
 const buildCam=new ArcRotateCamera('layout camera',-Math.PI/2.5,.64,34,new Vector3(0,0,1),scene);buildCam.lowerRadiusLimit=12;buildCam.upperRadiusLimit=47;buildCam.lowerBetaLimit=.25;buildCam.upperBetaLimit=1.1;buildCam.pinchPrecision=50;buildCam.wheelPrecision=16;buildCam.panningSensibility=75;
 const walkCam=new UniversalCamera('walk camera',new Vector3(1.7,1.72,-9),scene);walkCam.minZ=.08;walkCam.fov=1.05;walkCam.setTarget(new Vector3(1.7,1.72,5));walkCam.inputs.clear();
 scene.activeCamera=buildCam;buildCam.attachControl(canvas,true);
 const selectionMat=material('selection','#b374fa',0,'#6c3693');selectionMat.alpha=.25;
 const footprint=MeshBuilder.CreateGround('selected footprint',{width:1,height:1},scene);footprint.material=selectionMat;footprint.position.y=.036;footprint.isPickable=false;footprint.setEnabled(false);
 const keys=new Set<string>();let joystick={x:0,y:0};let looking:{id:number,x:number,y:number}|null=null;let dragging:{id:string,x:number,z:number,lastX:number,lastZ:number}|null=null;
 function select(id:string|null){selected=id;const item=layout?.items.find(i=>i.id===id);footprint.setEnabled(!!item&&mode==='build');if(item){const e=EQUIPMENT[item.kind];footprint.scaling.set(e.width+.35,1,e.depth+.35);footprint.position.set(item.x,.036,item.z);footprint.rotation.y=item.rotation;}}
 function reflectList(){mirrorTexture.renderList=scene.meshes.filter(m=>m!==floor && m.material!==mirrorMat && m!==footprint && !m.name.includes('contact shade') && !m.name.includes('floor seam'));}
 const api={
  setLayout(next:GymLayout){layout=next;const ids=new Set(next.items.map(i=>i.id));for(const [id,node] of objects)if(!ids.has(id)){node.dispose(false);objects.delete(id);}for(const item of next.items){let node=objects.get(item.id);if(node&&node.metadata?.kind!==item.kind){node.dispose(false);objects.delete(item.id);node=undefined;}if(!node){node=equipment(item.kind,item.id);objects.set(item.id,node);}node.position.set(item.x,0,item.z);node.rotation.y=item.rotation;}
    const color=next.lighting==='cyan'?'#42d2dc':next.lighting==='warm'?'#ecc58a':'#b477ed';violet.diffuseColor=Color3.FromHexString(color);violet.emissiveColor=Color3.FromHexString(color).scale(.7);rim.diffuse=Color3.FromHexString(color);turfmat.diffuseColor=Color3.FromHexString(color).scale(.3);murals.forEach(m=>m.setEnabled(next.mural));select(selected);reflectList();},
  setMode(next:Mode){mode=next;keys.clear();joystick={x:0,y:0};looking=null;buildCam.detachControl();ceiling.setEnabled(next==='explore');scene.activeCamera=next==='build'?buildCam:walkCam;if(next==='build')buildCam.attachControl(canvas,true);else if(layout&&!walkable(walkCam.position.x,walkCam.position.z,layout.items)){let found=false;for(let z=-11;z<12&&!found;z+=1)for(let x=-9;x<10;x+=1)if(walkable(x,z,layout.items)){walkCam.position.set(x,1.72,z);found=true;break;}}select(selected);},
  select,
  joystick(x:number,y:number){joystick={x,y};},
  resetView(){if(mode==='build'){buildCam.alpha=-Math.PI/2.5;buildCam.beta=.64;buildCam.radius=canvas.clientWidth<600?40:34;buildCam.setTarget(new Vector3(0,0,1));}else{if(!layout||walkable(1.7,-11.8,layout.items))walkCam.position.set(1.7,1.72,-11.8);else{let found=false;for(let z=-11;z<12&&!found;z++)for(let x=-9;x<10;x++)if(walkable(x,z,layout.items)){walkCam.position.set(x,1.72,z);found=true;break;}}walkCam.rotation.set(0,0,0);}},
  zoom(delta:number){buildCam.radius=Math.max(12,Math.min(47,buildCam.radius+delta));},
  async capture(){scene.render();return await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));},
  dispose(){window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearInputs);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerCancel);observer.disconnect();engine.stopRenderLoop();scene.dispose();engine.dispose();}
 };
 function floorPoint(e:PointerEvent){const rect=canvas.getBoundingClientRect();return scene.pick(e.clientX-rect.left,e.clientY-rect.top,m=>m===floor)?.pickedPoint;}
 function pointerDown(e:PointerEvent){
  if(mode==='explore'){if(!looking){looking={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}return;}
  if(e.button!==0)return;const r=canvas.getBoundingClientRect();const hit=scene.pick(e.clientX-r.left,e.clientY-r.top,m=>!!m.metadata?.itemId);const id=hit?.pickedMesh?.metadata?.itemId as string|undefined;
  if(id){callbacks.onSelect(id);select(id);const item=layout.items.find(i=>i.id===id);const point=floorPoint(e);if(item&&point){dragging={id,x:point.x-item.x,z:point.z-item.z,lastX:item.x,lastZ:item.z};buildCam.detachControl();canvas.setPointerCapture(e.pointerId);}}
 }
 function pointerMove(e:PointerEvent){if(mode==='explore'&&looking?.id===e.pointerId){walkCam.rotation.y+=(e.clientX-looking.x)*.004;walkCam.rotation.x=Math.max(-1.1,Math.min(1.1,walkCam.rotation.x+(e.clientY-looking.y)*.003));looking.x=e.clientX;looking.y=e.clientY;}else if(dragging){const p=floorPoint(e);const item=layout.items.find(i=>i.id===dragging!.id);if(!p||!item)return;const x=Math.round((p.x-dragging.x)*2)/2,z=Math.round((p.z-dragging.z)*2)/2;const node=objects.get(item.id)!;if(canPlace({...item,x,z},layout.items)){node.position.x=x;node.position.z=z;footprint.position.x=x;footprint.position.z=z;dragging.lastX=x;dragging.lastZ=z;}}}
 function pointerUp(e:PointerEvent){if(looking?.id===e.pointerId)looking=null;if(dragging){callbacks.onMove(dragging.id,dragging.lastX,dragging.lastZ);dragging=null;buildCam.attachControl(canvas,true);}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
 function pointerCancel(e:PointerEvent){looking=null;if(dragging){const item=layout.items.find(i=>i.id===dragging!.id);if(item){objects.get(item.id)?.position.set(item.x,0,item.z);select(selected);}dragging=null;if(mode==='build')buildCam.attachControl(canvas,true);}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
 function keyDown(e:KeyboardEvent){if((e.target as HTMLElement).closest('input,textarea,[role="dialog"],[role="menu"]'))return;if(mode==='explore'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}}
 function keyUp(e:KeyboardEvent){keys.delete(e.code);}
 function clearInputs(){keys.clear();joystick={x:0,y:0};looking=null;}
 function visibility(){clearInputs();if(document.hidden)engine.stopRenderLoop();else engine.runRenderLoop(render);}
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clearInputs);document.addEventListener('visibilitychange',visibility);
 function render(){if(mode==='explore'&&layout){const dt=Math.min(engine.getDeltaTime()/1000,.045);const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joystick.y;const strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;const len=Math.max(1,Math.hypot(forward,strafe));const yaw=walkCam.rotation.y;const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*dt*3/len,dz=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*dt*3/len;let {x,z}=walkCam.position;if(walkable(x+dx,z,layout.items))x+=dx;if(walkable(x,z+dz,layout.items))z+=dz;walkCam.position.x=x;walkCam.position.z=z;if(keys.has('ArrowLeft'))walkCam.rotation.y-=dt*1.5;if(keys.has('ArrowRight'))walkCam.rotation.y+=dt*1.5;}scene.render();}
 const observer=new ResizeObserver(()=>{engine.resize();if(mode==='build'&&canvas.clientWidth<600)buildCam.radius=Math.max(buildCam.radius,39);});observer.observe(canvas);
 engine.runRenderLoop(render);scene.executeWhenReady(callbacks.onReady);return api;
}

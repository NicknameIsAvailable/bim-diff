import{O as pt,C as re,S as oe,a as se,P as ae,V as $,b as L,M as Vt,c as le,d as J,R as ce,e as Nt,f as ue,g as Ut,h as de,i as St,j as _t,k as N,l as at,B as he,m as pe,n as $t,o as it,p as fe,q as nt,U as Xt,I as me,F as Tt,r as ft,s as V,W as ge,t as xt,u as Qt,L as ye,v as ve,w as rt,Q as lt}from"./main-DCEDsZvz.js";var we=Object.defineProperty,be=(r,t,e)=>t in r?we(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e,y=(r,t,e)=>be(r,typeof t!="symbol"?t+"":t,e);const Yt=(r,t)=>{const[e,i]=t.split("-");return Object.assign(r.style,{left:i==="left"?"0":i==="center"?"50%":"",right:i==="right"?"0":"",top:e==="top"?"0":e==="bottom"?"":"50%",bottom:e==="bottom"?"0":"",transform:`${i==="center"?"translateX(-50%)":""} ${e==="center"?"translateY(-50%)":""}`}),t},Se=({placement:r,size:t,offset:e,id:i,className:n})=>{const o=document.createElement("div"),{top:a,left:l,right:u,bottom:h}=e;return Object.assign(o.style,{id:i,position:"absolute",zIndex:"1000",height:`${t}px`,width:`${t}px`,margin:`${a}px ${u}px ${h}px ${l}px`,borderRadius:"100%"}),Yt(o,r),i&&(o.id=i),n&&(o.className=n),o},_e=r=>{const t=typeof r=="string"?document.querySelector(r):r;if(!t)throw Error("Invalid DOM element");return t};function mt(r,t,e){return Math.max(t,Math.min(e,r))}const xe=[["x",0,3],["y",1,4],["z",2,5]],Bt=new L;function Ct({isSphere:r},t,e){r&&(Bt.set(0,0,1).applyQuaternion(e.quaternion),xe.forEach(([i,n,o])=>{const a=Bt[i];let l=t[n],u=l.userData.opacity;l.material.opacity=mt(a>=0?u:u/2,0,1),l=t[o],u=l.userData.opacity,l.material.opacity=mt(a>=0?u/2:u,0,1)}))}const Ee=(r,t,e=10)=>Math.abs(r.clientX-t.x)<e&&Math.abs(r.clientY-t.y)<e,Dt=new ce,Ot=new J,Pt=(r,t,e,i)=>{Ot.set((r.clientX-t.left)/t.width*2-1,-((r.clientY-t.top)/t.height)*2+1),Dt.setFromCamera(Ot,e);const n=Dt.intersectObjects(i,!1),o=n.length?n[0]:null;return!o||!o.object.visible?null:o},ct=1e-6,Ae=2*Math.PI,Jt=["x","y","z"],Y=[...Jt,"nx","ny","nz"],ze=["x","z","y","nx","nz","ny"],Le=["z","x","y","nz","nx","ny"],gt="Right",ot="Top",yt="Front",vt="Left",st="Bottom",wt="Back",Me=[gt,ot,yt,vt,st,wt].map(r=>r.toLocaleLowerCase()),Zt=1.3,Rt=(r,t=!0)=>{const{material:e,userData:i}=r,{color:n,opacity:o}=t?i.hover:i;e.color.set(n),e.opacity=o},F=r=>JSON.parse(JSON.stringify(r)),Ue=r=>{const t=r.type||"sphere",e=t==="sphere",i=r.resolution||e?64:128,n=pt.DEFAULT_UP,o=n.z===1,a=n.x===1,{container:l}=r;r.container=void 0,r=JSON.parse(JSON.stringify(r)),r.container=l;const u=o?ze:a?Le:Y;Me.forEach((c,p)=>{r[c]&&(r[u[p]]=r[c])});const h={enabled:!0,color:16777215,opacity:1,scale:.7,labelColor:2236962,line:!1,border:{size:0,color:14540253},hover:{color:e?16777215:9688043,labelColor:2236962,opacity:1,scale:.7,border:{size:0,color:14540253}}},s={line:!1,scale:e?.45:.7,hover:{scale:e?.5:.7}},d={type:t,container:document.body,size:128,placement:"top-right",resolution:i,lineWidth:4,radius:e?1:.2,smoothness:18,animated:!0,speed:1,background:{enabled:!0,color:e?16777215:14739180,opacity:e?0:1,hover:{color:e?16777215:14739180,opacity:e?.2:1}},font:{family:"sans-serif",weight:900},offset:{top:10,left:10,bottom:10,right:10},corners:{enabled:!e,color:e?15915362:16777215,opacity:1,scale:e?.15:.2,radius:1,smoothness:18,hover:{color:e?16777215:9688043,opacity:1,scale:e?.2:.225}},edges:{enabled:!e,color:e?15915362:16777215,opacity:e?1:0,radius:e?1:.125,smoothness:18,scale:e?.15:1,hover:{color:e?16777215:9688043,opacity:1,scale:e?.2:1}},x:{...F(h),...e?{label:"X",color:16725587,line:!0}:{label:a?ot:gt}},y:{...F(h),...e?{label:"Y",color:9100032,line:!0}:{label:o||a?yt:ot}},z:{...F(h),...e?{label:"Z",color:2920447,line:!0}:{label:o?ot:a?gt:yt}},nx:{...F(s),label:e?"":a?st:vt},ny:{...F(s),label:e?"":o||a?wt:st},nz:{...F(s),label:e?"":o?st:a?vt:wt}};return bt(r,d),Jt.forEach(c=>bt(r[`n${c}`],F(r[c]))),{...r,isSphere:e}};function bt(r,...t){if(r instanceof HTMLElement||typeof r!="object"||r===null)return r;for(const e of t)for(const i in e)i!=="container"&&i in e&&(r[i]===void 0?r[i]=e[i]:typeof e[i]=="object"&&!Array.isArray(e[i])&&(r[i]=bt(r[i]||{},e[i])));return r}const Te=(r,t=2)=>{const e=new Nt,i=t*2,{isSphere:n,resolution:o,radius:a,font:l,corners:u,edges:h}=r,s=Y.map(f=>({...r[f],radius:a}));n&&u.enabled&&s.push(u),n&&h.enabled&&s.push(h);const d=document.createElement("canvas"),c=d.getContext("2d");d.width=o*2+i*2,d.height=o*s.length+i*s.length;const[p,m]=X(s,o,l);s.forEach(({radius:f,label:_,color:R,labelColor:w,border:b,hover:{color:k,labelColor:U,border:B}},G)=>{const H=o*G+G*i+t;P(t,H,t,o,f,_,b,R,w),P(o+t*3,H,t,o,f,_,B??b,k??R,U??w)});const x=s.length,S=t/(o*2),v=t/(o*6),g=1/x,T=new ue(d);return T.repeat.set(.5-2*S,g-2*v),T.offset.set(S,1-v),Object.assign(T,{colorSpace:de,wrapS:Ut,wrapT:Ut,userData:{offsetX:S,offsetY:v,cellHeight:g}}),T;function P(f,_,R,w,b,k,U,B,G){if(b=b*(w/2),B!=null&&B!==""&&(H(),c.fillStyle=e.set(B).getStyle(),c.fill()),U&&U.size){const W=U.size*w/2;f+=W,_+=W,w-=U.size*w,b=Math.max(0,b-W),H(),c.strokeStyle=e.set(U.color).getStyle(),c.lineWidth=U.size*w,c.stroke()}k&&M(c,f+w/2,_+(w+R)/2,k,e.set(G).getStyle());function H(){c.beginPath(),c.moveTo(f+b,_),c.lineTo(f+w-b,_),c.arcTo(f+w,_,f+w,_+b,b),c.lineTo(f+w,_+w-b),c.arcTo(f+w,_+w,f+w-b,_+w,b),c.lineTo(f+b,_+w),c.arcTo(f,_+w,f,_+w-b,b),c.lineTo(f,_+b),c.arcTo(f,_,f+b,_,b),c.closePath()}}function X(f,_,R){const w=[...f].sort((Z,ne)=>{var Lt,Mt;return(((Lt=Z.label)==null?void 0:Lt.length)||0)-(((Mt=ne.label)==null?void 0:Mt.length)||0)}).pop().label,{family:b,weight:k}=R,U=n?Math.sqrt(Math.pow(_*.7,2)/2):_;let B=U,G=0,H=0;do{c.font=`${k} ${B}px ${b}`;const Z=c.measureText(w);G=Z.width,H=Z.fontBoundingBoxDescent,B--}while(G>U&&B>0);const W=U/H,ee=Math.min(U/G,W),ie=Math.floor(B*ee);return[`${k} ${ie}px ${b}`,W]}function M(f,_,R,w,b){f.font=p,f.textAlign="center",f.textBaseline="middle",f.fillStyle=b,f.fillText(w,_,R+(n?m:0))}},Be=(r,t)=>r.offset.x=(t?.5:0)+r.userData.offsetX,Et=(r,t)=>{const{offset:e,userData:{offsetY:i,cellHeight:n}}=r;e.y=1-(t+1)*n+i};function At(r,t,e=2,i=2){const n=e/2-r,o=i/2-r,a=r/e,l=(e-r)/e,u=r/i,h=(i-r)/i,s=[n,o,0,-n,o,0,-n,-o,0,n,-o,0],d=[l,h,a,h,a,u,l,u],c=[3*(t+1)+3,3*(t+1)+4,t+4,t+5,2*(t+1)+4,2,1,2*(t+1)+3,3,4*(t+1)+3,4,0],p=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11].map(M=>c[M]);let m,x,S,v,g,T,P,X;for(let M=0;M<4;M++){v=M<1||M>2?n:-n,g=M<2?o:-o,T=M<1||M>2?l:a,P=M<2?h:u;for(let f=0;f<=t;f++)m=Math.PI/2*(M+f/t),x=Math.cos(m),S=Math.sin(m),s.push(v+r*x,g+r*S,0),d.push(T+a*x,P+u*S),f<t&&(X=(t+1)*M+f+4,p.push(M,X,X+1))}return new $t().setIndex(new it(new Uint32Array(p),1)).setAttribute("position",new it(new Float32Array(s),3)).setAttribute("uv",new it(new Float32Array(d),2))}const Ce=(r,t)=>{const e=new L,{isSphere:i,radius:n,smoothness:o}=r,a=At(n,o);return Y.map((l,u)=>{const h=u<3,s=Y[u],d=u?t.clone():t;Et(d,u);const{enabled:c,scale:p,opacity:m,hover:x}=r[s],S={map:d,opacity:m,transparent:!0},v=i?new St(new _t(S)):new N(a,new at(S)),g=h?s:s[1];return v.position[g]=(h?1:-1)*(i?Zt:1),i||v.lookAt(e.copy(v.position).multiplyScalar(1.7)),v.scale.setScalar(p),v.renderOrder=1,v.visible=c,v.userData={scale:p,opacity:m,hover:x},v})},De=(r,t)=>{const{isSphere:e,corners:i}=r;if(!i.enabled)return[];const{color:n,opacity:o,scale:a,radius:l,smoothness:u,hover:h}=i,s=e?null:At(l,u),d={transparent:!0,opacity:o},c=[1,1,1,-1,1,1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,-1,-1,-1,-1,-1].map(m=>m*.85),p=new L;return Array(c.length/3).fill(0).map((m,x)=>{if(e){const g=t.clone();Et(g,6),d.map=g}else d.color=n;const S=e?new St(new _t(d)):new N(s,new at(d)),v=x*3;return S.position.set(c[v],c[v+1],c[v+2]),e&&S.position.normalize().multiplyScalar(1.7),S.scale.setScalar(a),S.lookAt(p.copy(S.position).multiplyScalar(2)),S.renderOrder=1,S.userData={color:n,opacity:o,scale:a,hover:h},S})},Oe=(r,t,e)=>{const{isSphere:i,edges:n}=r;if(!n.enabled)return[];const{color:o,opacity:a,scale:l,hover:u,radius:h,smoothness:s}=n,d=i?null:At(h,s,1.2,.25),c={transparent:!0,opacity:a},p=[0,1,1,0,-1,1,1,0,1,-1,0,1,0,1,-1,0,-1,-1,1,0,-1,-1,0,-1,1,1,0,1,-1,0,-1,1,0,-1,-1,0].map(S=>S*.925),m=new L,x=new L(0,1,0);return Array(p.length/3).fill(0).map((S,v)=>{if(i){const P=t.clone();Et(P,e),c.map=P}else c.color=o;const g=i?new St(new _t(c)):new N(d,new at(c)),T=v*3;return g.position.set(p[T],p[T+1],p[T+2]),i&&g.position.normalize().multiplyScalar(1.7),g.scale.setScalar(l),g.up.copy(x),g.lookAt(m.copy(g.position).multiplyScalar(2)),!i&&!g.position.y&&(g.rotation.z=Math.PI/2),g.renderOrder=1,g.userData={color:o,opacity:a,scale:l,hover:u},g})};function Pe(r,t=!1){const e=r[0].index!==null,i=new Set(Object.keys(r[0].attributes)),n=new Set(Object.keys(r[0].morphAttributes)),o={},a={},l=r[0].morphTargetsRelative,u=new $t;let h=0;for(let s=0;s<r.length;++s){const d=r[s];let c=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const p in d.attributes){if(!i.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;o[p]===void 0&&(o[p]=[]),o[p].push(d.attributes[p]),c++}if(c!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+". Make sure all geometries have the same number of attributes."),null;if(l!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const p in d.morphAttributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+".  .morphAttributes must be consistent throughout all geometries."),null;a[p]===void 0&&(a[p]=[]),a[p].push(d.morphAttributes[p])}if(t){let p;if(e)p=d.index.count;else if(d.attributes.position!==void 0)p=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+s+". The geometry must have either an index or a position attribute"),null;u.addGroup(h,p,s),h+=p}}if(e){let s=0;const d=[];for(let c=0;c<r.length;++c){const p=r[c].index;for(let m=0;m<p.count;++m)d.push(p.getX(m)+s);s+=r[c].attributes.position.count}u.setIndex(d)}for(const s in o){const d=Gt(o[s]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+s+" attribute."),null;u.setAttribute(s,d)}for(const s in a){const d=a[s][0].length;if(d===0)break;u.morphAttributes=u.morphAttributes||{},u.morphAttributes[s]=[];for(let c=0;c<d;++c){const p=[];for(let x=0;x<a[s].length;++x)p.push(a[s][x][c]);const m=Gt(p);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+s+" morphAttribute."),null;u.morphAttributes[s].push(m)}}return u}function Gt(r){let t,e,i,n=-1,o=0;for(let h=0;h<r.length;++h){const s=r[h];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=s.itemSize),e!==s.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(i===void 0&&(i=s.normalized),i!==s.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(n===-1&&(n=s.gpuType),n!==s.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=s.count*e}const a=new t(o),l=new it(a,e,i);let u=0;for(let h=0;h<r.length;++h){const s=r[h];if(s.isInterleavedBufferAttribute){const d=u/e;for(let c=0,p=s.count;c<p;c++)for(let m=0;m<e;m++){const x=s.getComponent(c,m);l.setComponent(c+d,m,x)}}else a.set(s.array,u);u+=s.count*e}return n!==void 0&&(l.gpuType=n),l}const Re=(r,t)=>{const{isSphere:e,background:{enabled:i,color:n,opacity:o,hover:a}}=t;let l;const u=new at({color:n,side:he,opacity:o,transparent:!0,depthWrite:!1});if(!i)return null;if(e)l=new N(new pe(1.8,64,64),u);else{let h;r.forEach(s=>{const d=s.scale.x;s.scale.setScalar(.9),s.updateMatrix();const c=s.geometry.clone();c.applyMatrix4(s.matrix),h=h?Pe([h,c]):c,s.scale.setScalar(d)}),l=new N(h,u)}return l.userData={color:n,opacity:o,hover:a},l},Ht=new xt,K=new L;class Kt extends me{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const t=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],e=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new Tt(t,3)),this.setAttribute("uv",new Tt(e,2))}applyMatrix4(t){const e=this.attributes.instanceStart,i=this.attributes.instanceEnd;return e!==void 0&&(e.applyMatrix4(t),i.applyMatrix4(t),e.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(t){let e;t instanceof Float32Array?e=t:Array.isArray(t)&&(e=new Float32Array(t));const i=new ft(e,6,1);return this.setAttribute("instanceStart",new V(i,3,0)),this.setAttribute("instanceEnd",new V(i,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(t){let e;t instanceof Float32Array?e=t:Array.isArray(t)&&(e=new Float32Array(t));const i=new ft(e,6,1);return this.setAttribute("instanceColorStart",new V(i,3,0)),this.setAttribute("instanceColorEnd",new V(i,3,3)),this}fromWireframeGeometry(t){return this.setPositions(t.attributes.position.array),this}fromEdgesGeometry(t){return this.setPositions(t.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new ge(t.geometry)),this}fromLineSegments(t){const e=t.geometry;return this.setPositions(e.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new xt);const t=this.attributes.instanceStart,e=this.attributes.instanceEnd;t!==void 0&&e!==void 0&&(this.boundingBox.setFromBufferAttribute(t),Ht.setFromBufferAttribute(e),this.boundingBox.union(Ht))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Qt),this.boundingBox===null&&this.computeBoundingBox();const t=this.attributes.instanceStart,e=this.attributes.instanceEnd;if(t!==void 0&&e!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let n=0;for(let o=0,a=t.count;o<a;o++)K.fromBufferAttribute(t,o),n=Math.max(n,i.distanceToSquared(K)),K.fromBufferAttribute(e,o),n=Math.max(n,i.distanceToSquared(K));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(t){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(t)}}rt.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new J(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};nt.line={uniforms:Xt.merge([rt.common,rt.fog,rt.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class zt extends fe{constructor(t){super({type:"LineMaterial",uniforms:Xt.clone(nt.line.uniforms),vertexShader:nt.line.vertexShader,fragmentShader:nt.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(t)}get color(){return this.uniforms.diffuse.value}set color(t){this.uniforms.diffuse.value=t}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(t){t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(t){this.uniforms.linewidth&&(this.uniforms.linewidth.value=t)}get dashed(){return"USE_DASH"in this.defines}set dashed(t){t===!0!==this.dashed&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(t){this.uniforms.dashScale.value=t}get dashSize(){return this.uniforms.dashSize.value}set dashSize(t){this.uniforms.dashSize.value=t}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(t){this.uniforms.dashOffset.value=t}get gapSize(){return this.uniforms.gapSize.value}set gapSize(t){this.uniforms.gapSize.value=t}get opacity(){return this.uniforms.opacity.value}set opacity(t){this.uniforms&&(this.uniforms.opacity.value=t)}get resolution(){return this.uniforms.resolution.value}set resolution(t){this.uniforms.resolution.value.copy(t)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(t){this.defines&&(t===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),t===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const ut=new $,kt=new L,Ft=new L,E=new $,A=new $,C=new $,dt=new L,ht=new Vt,z=new ye,jt=new L,tt=new xt,et=new Qt,D=new $;let O,I;function It(r,t,e){return D.set(0,0,-t,1).applyMatrix4(r.projectionMatrix),D.multiplyScalar(1/D.w),D.x=I/e.width,D.y=I/e.height,D.applyMatrix4(r.projectionMatrixInverse),D.multiplyScalar(1/D.w),Math.abs(Math.max(D.x,D.y))}function Ge(r,t){const e=r.matrixWorld,i=r.geometry,n=i.attributes.instanceStart,o=i.attributes.instanceEnd,a=Math.min(i.instanceCount,n.count);for(let l=0,u=a;l<u;l++){z.start.fromBufferAttribute(n,l),z.end.fromBufferAttribute(o,l),z.applyMatrix4(e);const h=new L,s=new L;O.distanceSqToSegment(z.start,z.end,s,h),s.distanceTo(h)<I*.5&&t.push({point:s,pointOnLine:h,distance:O.origin.distanceTo(s),object:r,face:null,faceIndex:l,uv:null,uv1:null})}}function He(r,t,e){const i=t.projectionMatrix,n=r.material.resolution,o=r.matrixWorld,a=r.geometry,l=a.attributes.instanceStart,u=a.attributes.instanceEnd,h=Math.min(a.instanceCount,l.count),s=-t.near;O.at(1,C),C.w=1,C.applyMatrix4(t.matrixWorldInverse),C.applyMatrix4(i),C.multiplyScalar(1/C.w),C.x*=n.x/2,C.y*=n.y/2,C.z=0,dt.copy(C),ht.multiplyMatrices(t.matrixWorldInverse,o);for(let d=0,c=h;d<c;d++){if(E.fromBufferAttribute(l,d),A.fromBufferAttribute(u,d),E.w=1,A.w=1,E.applyMatrix4(ht),A.applyMatrix4(ht),E.z>s&&A.z>s)continue;if(E.z>s){const v=E.z-A.z,g=(E.z-s)/v;E.lerp(A,g)}else if(A.z>s){const v=A.z-E.z,g=(A.z-s)/v;A.lerp(E,g)}E.applyMatrix4(i),A.applyMatrix4(i),E.multiplyScalar(1/E.w),A.multiplyScalar(1/A.w),E.x*=n.x/2,E.y*=n.y/2,A.x*=n.x/2,A.y*=n.y/2,z.start.copy(E),z.start.z=0,z.end.copy(A),z.end.z=0;const p=z.closestPointToPointParameter(dt,!0);z.at(p,jt);const m=ve.lerp(E.z,A.z,p),x=m>=-1&&m<=1,S=dt.distanceTo(jt)<I*.5;if(x&&S){z.start.fromBufferAttribute(l,d),z.end.fromBufferAttribute(u,d),z.start.applyMatrix4(o),z.end.applyMatrix4(o);const v=new L,g=new L;O.distanceSqToSegment(z.start,z.end,g,v),e.push({point:g,pointOnLine:v,distance:O.origin.distanceTo(g),object:r,face:null,faceIndex:d,uv:null,uv1:null})}}}class ke extends N{constructor(t=new Kt,e=new zt({color:Math.random()*16777215})){super(t,e),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const t=this.geometry,e=t.attributes.instanceStart,i=t.attributes.instanceEnd,n=new Float32Array(2*e.count);for(let a=0,l=0,u=e.count;a<u;a++,l+=2)kt.fromBufferAttribute(e,a),Ft.fromBufferAttribute(i,a),n[l]=l===0?0:n[l-1],n[l+1]=n[l]+kt.distanceTo(Ft);const o=new ft(n,2,1);return t.setAttribute("instanceDistanceStart",new V(o,1,0)),t.setAttribute("instanceDistanceEnd",new V(o,1,1)),this}raycast(t,e){const i=this.material.worldUnits,n=t.camera;n===null&&!i&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const o=t.params.Line2!==void 0&&t.params.Line2.threshold||0;O=t.ray;const a=this.matrixWorld,l=this.geometry,u=this.material;I=u.linewidth+o,l.boundingSphere===null&&l.computeBoundingSphere(),et.copy(l.boundingSphere).applyMatrix4(a);let h;if(i)h=I*.5;else{const d=Math.max(n.near,et.distanceToPoint(O.origin));h=It(n,d,u.resolution)}if(et.radius+=h,O.intersectsSphere(et)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),tt.copy(l.boundingBox).applyMatrix4(a);let s;if(i)s=I*.5;else{const d=Math.max(n.near,tt.distanceToPoint(O.origin));s=It(n,d,u.resolution)}tt.expandByScalar(s),O.intersectsBox(tt)!==!1&&(i?Ge(this,e):He(this,n,e))}onBeforeRender(t){const e=this.material.uniforms;e&&e.resolution&&(t.getViewport(ut),this.material.uniforms.resolution.value.set(ut.z,ut.w))}}class te extends Kt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(t){const e=t.length-3,i=new Float32Array(2*e);for(let n=0;n<e;n+=3)i[2*n]=t[n],i[2*n+1]=t[n+1],i[2*n+2]=t[n+2],i[2*n+3]=t[n+3],i[2*n+4]=t[n+4],i[2*n+5]=t[n+5];return super.setPositions(i),this}setColors(t){const e=t.length-3,i=new Float32Array(2*e);for(let n=0;n<e;n+=3)i[2*n]=t[n],i[2*n+1]=t[n+1],i[2*n+2]=t[n+2],i[2*n+3]=t[n+3],i[2*n+4]=t[n+4],i[2*n+5]=t[n+5];return super.setColors(i),this}setFromPoints(t){const e=t.length-1,i=new Float32Array(6*e);for(let n=0;n<e;n++)i[6*n]=t[n].x,i[6*n+1]=t[n].y,i[6*n+2]=t[n].z||0,i[6*n+3]=t[n+1].x,i[6*n+4]=t[n+1].y,i[6*n+5]=t[n+1].z||0;return super.setPositions(i),this}fromLine(t){const e=t.geometry;return this.setPositions(e.attributes.position.array),this}}class Fe extends ke{constructor(t=new te,e=new zt({color:Math.random()*16777215})){super(t,e),this.isLine2=!0,this.type="Line2"}}const je=r=>{const t=new Nt,e=[],i=[],{isSphere:n}=r;if(Y.forEach((l,u)=>{const{enabled:h,line:s,scale:d,color:c}=r[l];if(!h||!s)return;const p=u<3?1:-1,m=(n?Zt-d/2:.975)*p;e.push(l.includes("x")?m:0,l.includes("y")?m:0,l.includes("z")?m:0,0,0,0);const x=t.set(c).toArray();i.push(...x,...x)}),!e.length)return null;const o=new te().setPositions(e).setColors(i),a=new zt({linewidth:r.lineWidth,vertexColors:!0,resolution:new J(window.innerWidth,window.innerHeight)});return new Fe(o,a).computeLineDistances()},Ie=r=>{const{corners:t,edges:e}=r,i=[],n=Te(r),o=Ce(r,n);i.push(...o),t.enabled&&i.push(...De(r,n)),e.enabled&&i.push(...Oe(r,n,t.enabled?7:6));const a=Re(o,r),l=je(r);return[i,a,l]},Q=(r,t=!0)=>{const{material:e,userData:i}=r,{opacity:n,color:o,scale:a}=t?i.hover:i;r.scale.setScalar(a),e.opacity=n,e.map?Be(e.map,t):e.color.set(o)},q=new Vt,Wt=new le,We=new J,j=new L,qt=new $;class Ve extends pt{constructor(t,e,i={}){super(),y(this,"enabled",!0),y(this,"camera"),y(this,"renderer"),y(this,"options"),y(this,"target",new L),y(this,"animated",!0),y(this,"speed",1),y(this,"animating",!1),y(this,"_options"),y(this,"_intersections"),y(this,"_background",null),y(this,"_viewport",[0,0,0,0]),y(this,"_originalViewport",[0,0,0,0]),y(this,"_originalScissor",[0,0,0,0]),y(this,"_scene"),y(this,"_camera"),y(this,"_container"),y(this,"_domElement"),y(this,"_domRect"),y(this,"_dragging",!1),y(this,"_distance",0),y(this,"_clock",new re),y(this,"_targetQuaternion",new lt),y(this,"_quaternionStart",new lt),y(this,"_quaternionEnd",new lt),y(this,"_pointerStart",new J),y(this,"_focus",null),y(this,"_placement"),y(this,"_controls"),y(this,"_controlsListeners"),this.camera=t,this.renderer=e,this._scene=new oe().add(this),this.set(i)}get placement(){return this._placement}set placement(t){this._placement=Yt(this._domElement,t),this.domUpdate()}set(t={}){this.dispose(),this.options=t,this._options=Ue(t),this._camera=this._options.isSphere?new se(-1.8,1.8,1.8,-1.8,5,10):new ae(26,1,5,10),this._camera.position.set(0,0,7);const[e,i,n]=Ie(this._options);i&&this.add(i),n&&this.add(n),this.add(...e),this._background=i,this._intersections=e;const{container:o,animated:a,speed:l}=this._options;return this.animated=a,this.speed=l,this._container=o?_e(o):document.body,this._domElement=Se(this._options),this._domElement.onpointerdown=u=>this._onPointerDown(u),this._domElement.onpointermove=u=>this._onPointerMove(u),this._domElement.onpointerleave=()=>this._onPointerLeave(),this._container.appendChild(this._domElement),this._controls&&this.attachControls(this._controls),this.update(),this._updateOrientation(!0),this}render(){this.animating&&this._animate();const{renderer:t,_viewport:e}=this,i=t.getScissorTest(),n=t.autoClear;return t.autoClear=!1,t.setViewport(...e),i&&t.setScissor(...e),t.clear(!1,!0,!1),t.render(this._scene,this._camera),t.setViewport(...this._originalViewport),i&&t.setScissor(...this._originalScissor),t.autoClear=n,this}domUpdate(){this._domRect=this._domElement.getBoundingClientRect();const t=this.renderer,e=this._domRect,i=t.domElement.getBoundingClientRect();return this._viewport.splice(0,4,e.left-i.left,t.domElement.clientHeight-(e.top-i.top+e.height),e.width,e.height),t.getViewport(qt).toArray(this._originalViewport),t.getScissorTest()&&t.getScissor(qt).toArray(this._originalScissor),this}cameraUpdate(){return this._updateOrientation(),this}update(t=!0){return t&&this._controls&&this._controls.update(),this.domUpdate().cameraUpdate()}attachControls(t){return this.detachControls(),this.target=t.target,this._controlsListeners={start:()=>t.enabled=!1,end:()=>t.enabled=!0,change:()=>this.update(!1)},this.addEventListener("start",this._controlsListeners.start),this.addEventListener("end",this._controlsListeners.end),t.addEventListener("change",this._controlsListeners.change),this._controls=t,this}detachControls(){if(!(!this._controlsListeners||!this._controls))return this.target=new L().copy(this._controls.target),this.removeEventListener("start",this._controlsListeners.start),this.removeEventListener("end",this._controlsListeners.end),this._controls.removeEventListener("change",this._controlsListeners.change),this._controlsListeners=void 0,this._controls=void 0,this}dispose(){var t;this.detachControls(),this.children.forEach(e=>{var i,n,o,a;this.remove(e);const l=e;(i=l.material)==null||i.dispose(),(o=(n=l.material)==null?void 0:n.map)==null||o.dispose(),(a=l.geometry)==null||a.dispose()}),(t=this._domElement)==null||t.remove()}_updateOrientation(t=!0){t&&(this.quaternion.copy(this.camera.quaternion).invert(),this.updateMatrixWorld()),Ct(this._options,this._intersections,this.camera)}_animate(){const{position:t,quaternion:e}=this.camera;if(t.set(0,0,1),!this.animated){t.applyQuaternion(this._quaternionEnd).multiplyScalar(this._distance).add(this.target),e.copy(this._targetQuaternion),this._updateOrientation(),this.animating=!1,this.dispatchEvent({type:"change"}),this.dispatchEvent({type:"end"});return}this._controls&&(this._controls.enabled=!1);const i=this._clock.getDelta()*Ae*this.speed;this._quaternionStart.rotateTowards(this._quaternionEnd,i),t.applyQuaternion(this._quaternionStart).multiplyScalar(this._distance).add(this.target),e.rotateTowards(this._targetQuaternion,i),this._updateOrientation(),requestAnimationFrame(()=>this.dispatchEvent({type:"change"})),this._quaternionStart.angleTo(this._quaternionEnd)<ct&&(this._controls&&(this._controls.enabled=!0),this.animating=!1,this.dispatchEvent({type:"end"}))}_setOrientation(t){const e=this.camera,i=this.target;j.copy(t).multiplyScalar(this._distance),q.setPosition(j).lookAt(j,this.position,this.up),this._targetQuaternion.setFromRotationMatrix(q),j.add(i),q.lookAt(j,i,this.up),this._quaternionEnd.setFromRotationMatrix(q),q.setPosition(e.position).lookAt(e.position,i,this.up),this._quaternionStart.setFromRotationMatrix(q),this.animating=!0,this._clock.start(),this.dispatchEvent({type:"start"})}_onPointerDown(t){if(!this.enabled)return;const e=u=>{if(!this._dragging){if(Ee(u,this._pointerStart))return;this._dragging=!0}const h=We.set(u.clientX,u.clientY).sub(this._pointerStart).multiplyScalar(1/this._domRect.width*Math.PI),s=this.coordinateConversion(j.subVectors(this.camera.position,this.target)),d=Wt.setFromVector3(s);d.theta=a-h.x,d.phi=mt(l-h.y,ct,Math.PI-ct),this.coordinateConversion(this.camera.position.setFromSpherical(d),!0).add(this.target),this.camera.lookAt(this.target),this.quaternion.copy(this.camera.quaternion).invert(),this._updateOrientation(!1),this.dispatchEvent({type:"change"})},i=()=>{if(document.removeEventListener("pointermove",e,!1),document.removeEventListener("pointerup",i,!1),!this._dragging)return this._handleClick(t);this._focus&&(Q(this._focus,!1),this._focus=null),this._dragging=!1,this.dispatchEvent({type:"end"})};if(this.animating)return;t.preventDefault(),this._pointerStart.set(t.clientX,t.clientY);const n=this.coordinateConversion(j.subVectors(this.camera.position,this.target)),o=Wt.setFromVector3(n),a=o.theta,l=o.phi;this._distance=o.radius,document.addEventListener("pointermove",e,!1),document.addEventListener("pointerup",i,!1),this.dispatchEvent({type:"start"})}coordinateConversion(t,e=!1){const{x:i,y:n,z:o}=t,a=pt.DEFAULT_UP;return a.x===1?e?t.set(n,o,i):t.set(o,i,n):a.z===1?e?t.set(o,i,n):t.set(n,o,i):t}_onPointerMove(t){!this.enabled||this._dragging||(this._background&&Rt(this._background,!0),this._handleHover(t))}_onPointerLeave(){!this.enabled||this._dragging||(this._background&&Rt(this._background,!1),this._focus&&Q(this._focus,!1),this._domElement.style.cursor="")}_handleClick(t){const e=Pt(t,this._domRect,this._camera,this._intersections);this._focus&&(Q(this._focus,!1),this._focus=null),e&&(this._setOrientation(e.object.position),this.dispatchEvent({type:"change"}))}_handleHover(t){const e=Pt(t,this._domRect,this._camera,this._intersections),i=e?.object||null;this._focus!==i&&(this._domElement.style.cursor=i?"pointer":"",this._focus&&Q(this._focus,!1),(this._focus=i)?Q(i,!0):Ct(this._options,this._intersections,this.camera))}}export{Ve as ViewportGizmo};

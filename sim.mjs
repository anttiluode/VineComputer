/* VineComputer — deterministic evolutionary developmental simulation.
   Coordinates, energies, obstacles and genes are abstractions, not plant biophysics. */
export const RULES = [
  {id:'heliotrope', name:'Sun seeker', color:'#D9C784', info:'Follows resource/light gradients.'},
  {id:'brancher', name:'Canopy builder', color:'#8ECE96', info:'Creates many competing growth tips.'},
  {id:'climber', name:'Climber', color:'#B2A9ED', info:'Persists upward and bends around obstacles.'},
  {id:'forager', name:'Forager', color:'#D6A37F', info:'Prioritizes nearby uncollected resources.'},
  {id:'explorer', name:'Explorer', color:'#8CCFD6', info:'Uses stochastic directional exploration.'},
  {id:'conserver', name:'Conserver', color:'#A4BFA4', info:'Invests in persistence and lean wiring.'}
];
export const TRAITS = ['tropism','branching','persistence','exploration','avoidance','stepSize','memory'];
export const DEFAULTS = {
  heliotrope:[.88,.25,.48,.12,.45,.60,.22],brancher:[.60,.78,.42,.37,.50,.48,.42],
  climber:[.60,.33,.86,.10,.92,.57,.38],forager:[.83,.48,.36,.19,.62,.49,.85],
  explorer:[.42,.56,.35,.90,.44,.55,.48],conserver:[.52,.17,.82,.11,.70,.42,.55]
};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function rng(seed=1){let s=(seed>>>0)||1;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function randomNormal(rand){return Math.sqrt(-2*Math.log(Math.max(1e-10,rand())))*Math.cos(2*Math.PI*rand());}
const angle=(x,y)=>Math.atan2(y,x);
const wrap=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
const pointDistance=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const ixhash=(seed,a,b)=>((Math.imul(seed^0x9E3779B9,1664525)+Math.imul(a+1,1013904223)+Math.imul(b+1,2246822519))>>>0);
export function initialGenome(rule,rand){return {rule,genes:DEFAULTS[rule].map(g=>clamp(g+randomNormal(rand)*.12))};}
export function mutate(parent,rand,strength=.13){let rule=parent.rule;
  if(rand()<.025+strength*.12)rule=RULES[Math.floor(rand()*RULES.length)].id;
  const genes=parent.genes.map((g,i)=>clamp(g+randomNormal(rand)*strength*(i===1?.85:1.0)));
  return {rule,genes};
}
export function createWorld(seed=1,scenario='patches',holdout=false){
  const r=rng(seed+(holdout?90131:0));
  const resourceCount=scenario==='corridor'?6:scenario==='seasonal'?8:7;
  const resources=[];
  for(let i=0;i<resourceCount;i++){
    let x=.12+r()*.76,y=.14+r()*.47;
    if(scenario==='corridor'){
      x= i%2===0?.18+r()*.13:.70+r()*.13;
      y=.14+(.06*(i%3))+r()*.35;
    }
    if(scenario==='seasonal'){
      x=.13+(.72*i/(resourceCount-1))+.05*(r()-.5);
      y=.13+r()*.45;
    }
    resources.push({x,y,r:.055+.019*r(),value:10+5*r(),phase:r()*Math.PI*2});
  }
  const obstacles=[];
  const n=scenario==='corridor'?5:scenario==='patches'?3:4;
  for(let i=0;i<n;i++){
    const x=.15+r()*.7,y=.32+r()*.43;
    obstacles.push({x,y,r:.046+r()*.040});
  }
  return {seed,scenario,holdout,resources,obstacles};
}
export function moveResource(res,world,time){
  if(world.scenario==='seasonal')return {x:clamp(res.x+.09*Math.sin(.060*time+res.phase),.045,.955),y:res.y};
  return {x:res.x,y:res.y};
}
function distPointSegment(px,py,ax,ay,bx,by){let dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy+1e-15));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));}
export function grow(genome,world,seed=1,options={}){
  const r=rng(seed);const g=genome.genes,style=genome.rule;
  const maxTicks=options.ticks??57;const capture=options.capture!==false;
  const segments=[],frames=[];
  let tips=[{x:.5,y:.962,a:-Math.PI/2,life:0,depth:0}];
  const harvested=new Set();let wire=0,collisions=0,maxHeight=0,energy=0,meanReach=0;
  const branchRate=.025+.17*g[1]*(style==='brancher'?1.36:1);
  const maxTips=4+Math.round(g[1]*11);
  const step=.0095+.013*g[5];
  for(let t=0;t<maxTicks;t++){
    const newTips=[];const next=[];
    for(const tip of tips){
      // Life budget caps exploding branch forests without hard-coding a terminal shape.
      if(tip.life>63||segments.length>700)continue;
      let tx=0,ty=0,attraction=0;
      for(let j=0;j<world.resources.length;j++){
        if(harvested.has(j))continue;
        const p=moveResource(world.resources[j],world,t),dx=p.x-tip.x,dy=p.y-tip.y;
        const dd=Math.max(.015,Math.hypot(dx,dy));
        const priority=(1-g[6])*.7 + g[6]*(world.resources[j].value/14);
        const w=(style==='forager'?1.7:1)*priority/(.04+dd*dd);
        tx+=dx/dd*w;ty+=dy/dd*w;attraction+=w;
      }
      let desired=attraction>0?angle(tx,ty):-Math.PI/2;
      if(style==='conserver')desired=wrap(.65*desired+.35*(-Math.PI/2));
      if(style==='climber')desired=wrap(.48*desired+.52*(-Math.PI/2));
      if(style==='explorer')desired+=.45*Math.sin(.14*t+tip.depth*1.37);
      // Obstacle avoidance: local direction pushed away before touching obstacle.
      let ax=0,ay=0;
      for(const obs of world.obstacles){
        const dx=tip.x-obs.x,dy=tip.y-obs.y,dd=Math.max(.001,Math.hypot(dx,dy));
        const proximity=clamp((obs.r+.12-dd)/.12);
        ax+=dx/dd*proximity*proximity;ay+=dy/dd*proximity*proximity;
      }
      if(Math.abs(ax)+Math.abs(ay)>.001){
        const vx=Math.cos(desired)+g[4]*2.4*ax,vy=Math.sin(desired)+g[4]*2.4*ay;
        desired=angle(vx,vy);
      }
      const steer=(.05+.27*g[0])*(1-.62*g[2]);
      let da=wrap(desired-tip.a);
      let heading=tip.a+clamp(da*steer,-.31,.31)+randomNormal(r)*(.015+.17*g[3]);
      heading=wrap(heading);
      let nx=tip.x+Math.cos(heading)*step,ny=tip.y+Math.sin(heading)*step;
      if(nx<.025||nx>.975||ny<.035||ny>.976){continue;}
      let hit=false;
      for(const o of world.obstacles){if(distPointSegment(o.x,o.y,tip.x,tip.y,nx,ny)<o.r+.006){hit=true;break;}}
      if(hit){collisions++;if(r()<.70)continue;heading+= (r()<.5?1:-1)*.8;nx=tip.x+Math.cos(heading)*step;ny=tip.y+Math.sin(heading)*step;}
      const seg={ax:tip.x,ay:tip.y,bx:nx,by:ny,depth:tip.depth,age:t};segments.push(seg);
      wire+=step;maxHeight=Math.max(maxHeight,1-ny);
      for(let i=0;i<world.resources.length;i++){
        if(harvested.has(i))continue;
        const p=moveResource(world.resources[i],world,t);
        if(distPointSegment(p.x,p.y,tip.x,tip.y,nx,ny)<=world.resources[i].r){
          harvested.add(i);energy+=world.resources[i].value*(1+.25*(maxTicks-t)/maxTicks);
        }
      }
      next.push({x:nx,y:ny,a:heading,life:tip.life+1,depth:tip.depth});
      if(r()<branchRate && (next.length+newTips.length)<maxTips && t<maxTicks-9){
        const branchAngle=heading+(r()<.5?-1:1)*(.3+.75*r());
        newTips.push({x:nx,y:ny,a:branchAngle,life:tip.life+1,depth:tip.depth+1});
      }
    }
    tips=next.concat(newTips).slice(0,maxTips);
    if(capture)frames.push({segments:segments.length,harvested:[...harvested],t});
    if(tips.length===0)break;
  }
  const penalty=wire*5.1+collisions*2.9+Math.max(0,segments.length-260)*.015;
  const fitness=energy-penalty;
  return {fitness,energy,wire,collisions,coverage:harvested.size,maxHeight,segments: capture?segments:[],frames:capture?frames:[],nodes:segments.length,genome,worldSeed:world.seed};
}
export function evalGenome(genome,worlds,seed){const scores=worlds.map((w,i)=>grow(genome,w,ixhash(seed,i,2),{capture:false}));return {fitness:scores.reduce((a,x)=>a+x.fitness,0)/scores.length,coverage:scores.reduce((a,x)=>a+x.coverage,0)/scores.length,wire:scores.reduce((a,x)=>a+x.wire,0)/scores.length};}
function tournament(scored,rand){const choices=[0,1,2].map(()=>scored[Math.floor(rand()*scored.length)]);choices.sort((a,b)=>b.fitness-a.fitness);return choices[0].genome;}
function pickBest(arr){return arr.reduce((a,b)=>b.fitness>a.fitness?b:a);}
function average(a,key){return a.reduce((s,x)=>s+x[key],0)/a.length;}
export class Evolution{
  constructor(seed=20251012,scenario='patches',population=36){this.seed=seed;this.scenario=scenario;this.population=population;this.generation=0;this.mutation=.13;this.rand=rng(seed+7741);this.history=[];this.populationA=Array.from({length:population},(_,i)=>initialGenome(RULES[i%RULES.length].id,this.rand));this.populationB=this.populationA.map(x=>({rule:x.rule,genes:[...x.genes]}));}
  worlds(gen){return [createWorld(ixhash(this.seed,gen,11),this.scenario),createWorld(ixhash(this.seed,gen,23),this.scenario)];}
  holdout(gen){return createWorld(ixhash(this.seed,100000+gen,67),this.scenario,true);}
  advance(){
    const gen=this.generation,worlds=this.worlds(gen),heldout=this.holdout(gen);
    const evaluate=(pop,offset)=>pop.map((genome,i)=>({...evalGenome(genome,worlds,ixhash(this.seed,gen,i+offset)),genome}));
    const selected=evaluate(this.populationA,100),drift=evaluate(this.populationB,10000);
    selected.sort((a,b)=>b.fitness-a.fitness);drift.sort((a,b)=>b.fitness-a.fitness);
    const champion=selected[0],randomChampion=drift[0];
    const heldoutResult=evalGenome(champion.genome,[heldout],ixhash(this.seed,gen,800));
    const driftHeldout=evalGenome(randomChampion.genome,[heldout],ixhash(this.seed,gen,800));
    const chosenWorld=worlds[0];const drawing=grow(champion.genome,chosenWorld,ixhash(this.seed,gen,2),{capture:true});
    const diversity=new Set(selected.map(x=>x.genome.rule)).size;
    const record={generation:gen+1,average:average(selected,'fitness'),best:champion.fitness,driftBest:randomChampion.fitness,holdout:heldoutResult.fitness,driftHoldout:driftHeldout.fitness,coverage:champion.coverage,wire:champion.wire,diversity,rule:champion.genome.rule,genome:{rule:champion.genome.rule,genes:[...champion.genome.genes]},world:chosenWorld,holdoutWorld:heldout,drawing};
    this.history.push(record);
    const children=[{rule:champion.genome.rule,genes:[...champion.genome.genes]}];
    // Elitism is intentional: selection can retain the best architecture.
    while(children.length<this.population){const parent=tournament(selected,this.rand);children.push(mutate(parent,this.rand,this.mutation));}
    // Control uses the same population size, same mutation operator, same initial genotypes and worlds,
    // but parent identity is unrelated to fitness (neutral genetic drift).
    const neutralParent=this.populationB[Math.floor(this.rand()*this.populationB.length)];
    const randomChildren=[{rule:neutralParent.rule,genes:[...neutralParent.genes]}];
    while(randomChildren.length<this.population){const parent=this.populationB[Math.floor(this.rand()*this.populationB.length)];randomChildren.push(mutate(parent,this.rand,this.mutation));}
    this.populationA=children;this.populationB=randomChildren;this.generation++;
    return record;
  }
}

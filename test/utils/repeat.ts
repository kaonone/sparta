import Snapshot from "./snapshot";

type TestFunction = () => Promise<void>;

/**
 * Usage:
 *  import Snapshot from "./utils/snapshot";
 *  import repeat from "./utils/repeat";
 *  //...
 *  let snap: Snapshot;
 *  snap = await Snapshot.create(web3.currentProvider);
 *  //...
 *  it('should repeatedly execute test', async() => repeat(snap, async() =>{
 *       // your test
 *  }));
 */
export default async function repeat(snap:Snapshot, action:TestFunction, iterations:number=20, revert:boolean=true){
    for(let i=0; i < iterations; i++){
        if(revert) snap.revert();
        await action();
    }
}

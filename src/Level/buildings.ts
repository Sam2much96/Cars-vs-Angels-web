/**
 * 
 * Buildings
 * 
 * Features:
 * (1) loads the building models into the scene
 * (2) load buidlings either individually or all together
 */


export class Buildings {
    constructor(loader = window.loader, scene = window.scene){
        loader.load('./buildings_mesh.glb', (gltf) => {
    const buildings = gltf.scene;
    //buildings.traverse((obj) => {
      
   // });

    scene.add(buildings);

}, undefined, (err) => {
    console.error('CITY LOAD ERROR:', err);
});

    }
}


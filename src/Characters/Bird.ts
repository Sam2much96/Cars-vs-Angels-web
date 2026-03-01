/**
 * 
 * Bird 3d object
 * 
 * 
 */

export class Bird {
    constructor(loader = window.loader, scene = window.scene){
        loader.load('./bird.glb', (gltf) => {
    const man = gltf.scene;

    scene.add(man);

}, undefined, (err) => {
    console.error('BIRD LOAD ERROR:', err);
});

    }
}
/**
 * 
 * Dragon 3d object
 * 
 * 
 */

export class Dragon {
    constructor(loader = window.loader, scene = window.scene){
        loader.load('./dragon.glb', (gltf) => {
    const dragon = gltf.scene;

    scene.add(dragon);

}, undefined, (err) => {
    console.error('DRAGON LOAD ERROR:', err);
});

    }
}
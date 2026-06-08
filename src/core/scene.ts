import * as THREE from 'three';

export function createSceneSetup() {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 6);

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: !isMobile,   // antialias is ~30% GPU overhead — skip on mobile
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isMobile; // shadows off on mobile
    renderer.shadowMap.type = THREE.BasicShadowMap; // cheaper than PCFSoftShadowMap on desktop
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer };
}

export function createLights(scene: THREE.Scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 512;
    dirLight.shadow.mapSize.height = 512;
    scene.add(dirLight);

    return { ambientLight, dirLight };
}

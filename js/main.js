import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;


function setupScene() {

    // const gui = new GUI();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.y = 30;
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    // orbit.enableZoom = false;

    setupLights(scene);
    setupLevel(scene);

    function render() {

        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', function () {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    render();
}

function setupLights(scene) {

    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);
}

function setupLevel(scene) {

    // Middle cylinder object
    const data = {
        radiusTop: 3,
        radiusBottom: 3,
        height: 50,
        radialSegments: 30,
        heightSegments: 1,
        openEnded: false,
        thetaStart: 0,
        thetaLength: twoPi
    };

    const cylinderGeometry = new THREE.CylinderGeometry(
        data.radiusTop,
        data.radiusBottom,
        data.height,
        data.radialSegments,
        data.heightSegments,
        data.openEnded,
        data.thetaStart,
        data.thetaLength
    );

    const meshMaterial = new THREE.MeshPhongMaterial({ color: 0x156289, emissive: 0x072534, side: THREE.DoubleSide, flatShading: true });

    const generalGroup = new THREE.Group();
    generalGroup.add(new THREE.Mesh(cylinderGeometry, meshMaterial));
    scene.add(generalGroup);

    // Platforms
    setupPlatforms(scene);

    // Ball
    setupBall(scene);
}


function setupPlatforms(scene) {

    const torusData = {
        radius: 6,
        tube: 3,
        radialSegments: 3,
        tubularSegments: 40,
        arc: twoPi
    };

    const torusGeometry = new THREE.TorusGeometry(
        torusData.radius, torusData.tube, torusData.radialSegments, torusData.tubularSegments, torusData.arc
    );

    const meshMaterial = new THREE.MeshPhongMaterial({ color: 0x156289, emissive: 0x072534, side: THREE.DoubleSide, flatShading: true });

    const platformGroup = new THREE.Group();
    platformGroup.add(new THREE.Mesh( torusGeometry, meshMaterial ));
    platformGroup.rotation.x = Math.PI / 2;

    scene.add(platformGroup);
}

function setupBall(scene) {

    const sphereData = {
        radius: 1.5,
        widthSegments: 32,
        heightSegments: 16,
        phiStart: 0,
        phiLength: twoPi,
        thetaStart: 0,
        thetaLength: Math.PI
    };

    const sphereGeometry = new THREE.SphereGeometry(
        sphereData.radius, sphereData.widthSegments, sphereData.heightSegments,
        sphereData.phiStart, sphereData.phiLength, sphereData.thetaStart, sphereData.thetaLength
    )

    const meshMaterial = new THREE.MeshPhongMaterial({ color: 0x156289, emissive: 0x072534, side: THREE.DoubleSide, flatShading: true });
    // const ballMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    const sphere = new THREE.Mesh(sphereGeometry, meshMaterial);
    sphere.position.x = 5;
    sphere.position.y = 5;

    const ballGroup = new THREE.Group();
    ballGroup.add(sphere);
    scene.add(ballGroup);
}

setupScene();

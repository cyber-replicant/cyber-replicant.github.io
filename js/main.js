import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

// THREE basic constructs
let camera, clock, scene, renderer;

// THREE groups
let generalGroup, platformGroup, ballGroup;

// THREE objects
let ball, ballBounds;
let skybox;

// Ammo.js Physics variables
const gravityConstant = 20;
const collisionMargin = 0.05;
const rigidBodies = [];
let physicsWorld;
let transform;

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();

// Game variables
let pointerDown = false;
let platforms = [];
let numDestroyChunksToSpawn = 3;

const numPlatforms = 15;
const platformGapSize = 10;


// ----------------------------------------------------------------------------------------------------------------
// Helpers functions
// ----------------------------------------------------------------------------------------------------------------

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}


// ----------------------------------------------------------------------------------------------------------------
// Physics setup
// ----------------------------------------------------------------------------------------------------------------

Ammo().then(function(AmmoLib) {

    Ammo = AmmoLib;

    setupScene();
    animate();
});

function setupPhysics() {

    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, - gravityConstant, 0));

    transform = new Ammo.btTransform();
}


// ----------------------------------------------------------------------------------------------------------------
// Scene setup
// ----------------------------------------------------------------------------------------------------------------

function setupScene() {

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 30000);
    camera.position.y = 15;
    camera.position.x = 4;
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // const orbit = new OrbitControls(camera, renderer.domElement);
    // orbit.enableZoom = false;

    setupLights(scene);
    setupPhysics();

    setupLevel(scene);

    camera.lookAt(ball.position);

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

    generalGroup = new THREE.Group();
    platformGroup = new THREE.Group();

    // Middle cylinder object
    const middleCylinderRadius = 3;
    const middleCylinderHeight = 200;

    const data = {
        radiusTop: middleCylinderRadius,
        radiusBottom: middleCylinderRadius,
        height: middleCylinderHeight,
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

    const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0x711C91,
        emissive: 0x380034,
        side: THREE.DoubleSide
    });

    let cylinderObject = new THREE.Mesh(cylinderGeometry, meshMaterial);

    cylinderObject.position.y = -20;
    generalGroup.add(cylinderObject);


    scene.add(generalGroup);
    scene.add(platformGroup);

    // Platforms
    setupPlatforms(scene);

    // Ball
    setupBall(scene);

    // Skybox
    setupSkybox();
}

function setupSkybox() {

    const skyboxTexturePaths = [
        './static/skybox/skybox2.png', // right
        './static/skybox/skybox2.png', // left
        './static/skybox/skybox1.png',
        './static/skybox/skybox3.png', // bottom
        './static/skybox/skybox2.png',
        './static/skybox/skybox1.png', //back
    ];

    const materialArray = skyboxTexturePaths.map(image => {
        let texture = new THREE.TextureLoader().load(image);
        return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    });

    let material = new THREE.MeshBasicMaterial({ color: generateRandomColor() });
    let object = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000, 1, 1, 1 ), materialArray);
    object.position.set(0, 0, 0);
    generalGroup.add(object);
}

function setupPlatforms(scene) {

    let destroyChunks = {};

    // Calculate where to randomly place destroy chunks
    while (numDestroyChunksToSpawn > 0) {

        // Never spawn a destroy chunk in the top 3 platforms
        let platformIndex = getRandomInt(3,  numPlatforms - 1);

        if (platformIndex in destroyChunks) {
            continue;
        }

        destroyChunks[platformIndex] = true;
        numDestroyChunksToSpawn -= 1;
    }

    // Generate the chunks for each platform
    for (let i = 0; i < numPlatforms; i++) {

        let hasDestroyChunk = destroyChunks[i];
        generatePlatform(i * -platformGapSize, hasDestroyChunk);
    }
}

function generatePlatform(platformY, hasDestroyChunk) {

    const chunkSize = twoPi / 8;

    // Rotations and positions of platform chunks
    const rotations = [
        chunkSize * 1.5,
        chunkSize * 2.5,
        chunkSize * 3.5,
        chunkSize * 4.5,
        chunkSize * 5.5,
        chunkSize * 6.5,
        chunkSize * 7.5,
        chunkSize * 8.5,
    ];

    const startPos = new THREE.Vector3(0, 5, 5);

    const positions = [
        new THREE.Vector3(5, 5, 0),
        new THREE.Vector3(5, 5, -5),
        new THREE.Vector3(0, 5, -5),
        new THREE.Vector3(-5, 5, -5),
        new THREE.Vector3(-5, 5, 0),
        new THREE.Vector3(-5, 5, 5),
        new THREE.Vector3(0, 5, 5),
        new THREE.Vector3(5, 5, 5),
    ];

    // Remove a random amount of pie chunks from the platform
    const maxChunksToRemove = 4;
    let numChunksToRemove = getRandomInt(3, 5);

    while (numChunksToRemove > 0) {

        let randomIndex = getRandomInt(0,  positions.length - 1);

        // Never remove the first piece when on the first platform
        if (platformY === 0 && positions[randomIndex].equals(startPos)) {
            continue;
        }

        positions.splice(randomIndex, 1);
        rotations.splice(randomIndex, 1);
        numChunksToRemove -= 1;
    }

    // If a destroy chunk exists on this platform, choose a random place for it
    let destroyChunkIndex = -1;

    if (hasDestroyChunk === true) {
        destroyChunkIndex = getRandomInt(0, positions.length - 1);
    }

    for (let i = 0, il = positions.length; i < il; i++) {

        let position = positions[i];
        let rotationY = rotations[i];

        let chunk = generatePieChunk(rotationY, platformY);

        let material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        let object = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2, 1, 1, 1 ), material);

        object.geometry.computeBoundingBox();
        object.position.set(position.x, platformY, position.z);
        object.visible = false;

        platformGroup.add(object);

        let cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        cubeBounds.setFromObject(object);

        object.userData.cubeBounds = cubeBounds;
        platforms.push(object);
    }
}

function generatePieChunk(rotationY, platformY) {

    let color = generateRandomColor();
    let emissive = generateRandomColor();

    const data = {
        radius: 9,
        height: 2,
        radialSegments: 30,
        heightSegments: 1,
        openEnded: false,
        thetaStart: 0,
        thetaLength: twoPi / 8
    };

    const cylinderGeometry = new THREE.CylinderGeometry(
        data.radius,
        data.radius,
        data.height,
        data.radialSegments,
        data.heightSegments,
        data.openEnded,
        data.thetaStart,
        data.thetaLength
    );

    const meshMaterial = new THREE.MeshPhongMaterial({
        // color: 0x133E7C,
        // emissive: 0x072534,
        color: color,
        emissive: emissive,
        side: THREE.DoubleSide
    });

    const object = new THREE.Mesh(cylinderGeometry, meshMaterial);
    platformGroup.add(object);

    object.rotation.y = rotationY;
    object.position.y = platformY;

    return object;
}



function setupBall(scene) {

    const ballMass = 5;
    const ballRadius = 1;

    const sphereData = {
        radius: ballRadius,
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

    const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0x156289,
        emissive: 0x091833,
        side: THREE.DoubleSide,
        // flatShading: true
    });

    
    // const ballMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    ball = new THREE.Mesh(sphereGeometry, meshMaterial);
    const ballShape = new Ammo.btSphereShape(sphereData.radius);
    ballShape.setMargin(collisionMargin);

    ball.castShadow = true;
    ball.receiveShadow = true;

    pos.set(0, 10, 5);
    ball.position.copy(pos);

    ballBounds = new THREE.Sphere(pos, ballRadius);

    quat.set(0, 0, 0, 1);
    const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);

    ballBody.setRestitution(1);
    // pos.copy( raycaster.ray.direction );
    // pos.add( raycaster.ray.origin );

    pos.set(0, -5, 0);
    pos.multiplyScalar(2);
    ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

    ballGroup = new THREE.Group();
    ballGroup.add(ball);
    scene.add(ballGroup);
}

function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {

    if (pos) {
        object.position.copy(pos);
    } else {
        pos = object.position;
    }

    if (quat) {
        object.quaternion.copy(quat);
    } else {
        quat = object.quaternion;
    }

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);
    // body.setAngularFactor( 0, 1, 0 );
    // body.setRollingFriction(10);

    if (vel) {
        body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
    }

    if (angVel) {
        body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
    }

    object.userData.physicsBody = body;

    // scene.add(object);

    if (mass > 0) {

        rigidBodies.push(object);

        // Disable deactivation
        body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
    return body;

}

function generateRandomColor() {

    return Math.floor(Math.random() * ( 1 << 24 ));
}

function checkCollisions() {

    for (const platform of platforms) {
        const cubeBounds = platform.userData.cubeBounds;
        cubeBounds.copy(platform.geometry.boundingBox).applyMatrix4(platform.matrixWorld);

        if (ballBounds.intersectsBox(cubeBounds)) {
            // ball.material.opacity = 0.1;
            ball.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,15,0));
            // console.log("SDFSDF");
        }
    }
}

function animate() {

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

    const MEOW = 10;

    if (camera.position.y - ball.position.y >= MEOW) {
        camera.position.y -= 1;
        // camera.lookAt(ball.position);
    }

    checkCollisions();

    render();
    requestAnimationFrame(animate);
}

function render() {

    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);

    renderer.render(scene, camera);
    // camera.lookAt(ballGroup.position);
}

function updatePhysics(deltaTime) {

    // Hinge control
    // if (pointerDown) {
    //     hinge.enableAngularMotor( true, 1.5 * armMovement, 50 );
    // }

    // Step world
    physicsWorld.stepSimulation(deltaTime * 2, 10);

    // Update rigid bodies
    for (let i = 0, il = rigidBodies.length; i < il; i ++) {

        const objThree = rigidBodies[i];
        const objPhys = objThree.userData.physicsBody;
        const ms = objPhys.getMotionState();

        if (ms) {
            ms.getWorldTransform(transform);
            const p = transform.getOrigin();
            const q = transform.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
            // camera.position.y = p.y();
        }
    }
}

window.addEventListener('resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


const raycaster = new THREE.Raycaster();
let mouseX = 0, mouseY = 0;

window.addEventListener('pointerdown', function(event) {

    event.preventDefault();

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    return false;
});

let rot = new THREE.Vector3(0,0,0);

window.addEventListener('pointerup', function(event) {

    event.preventDefault();

    pointerDown = false;
    return false;
});

window.addEventListener('pointermove', function(event) {

    if (!pointerDown) {
        return;
    }

    event.preventDefault();

    let deltaX = event.clientX - mouseX;
    let deltaY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;

    platformGroup.rotation.y -= deltaX / 100;
    // arm.rotation.y -= deltaX / 50;
    // var euler = new THREE.Euler(arm.rotation.x,arm.rotation.y,arm.rotation.z);
    // quat.setFromEuler(euler);
    // // console.log(boop.rotation);
    // // console.log(boop.quaternion);
    // setObjectRotation(arm, quat);
    // rot.set(0,deltaX/2,0);
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(rot.x, rot.y, rot.z));
    // ballGroup.rotation.y -= deltaX / 50;

    // const transform = ball.userData.physicsBody.getCenterOfMassTransform();
    // let q = transform.getRotation();
    // console.log(q.x() + " " + q.y() + " " + q.z() + " " + q.w());

    // var euler = new THREE.Euler(generalGroup.rotation.x,generalGroup.rotation.y,generalGroup.rotation.z);
    // quat.setFromEuler(euler);
    // // quat.set(q.x(), q.y() - deltaX / 50, q.z(), 1);
    // transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    // ball.userData.physicsBody.setCenterOfMassTransform(transform);

    // for (const platform of platforms) {
    //     // const ms = platform.getMotionState();
    //     const transform = platform.getWorldTransform();
    //     let q = transform.getRotation();
    //     quat.set(1, q.x(), generalGroup.rotation.y, q.z());
    //     console.log(q.x() + " " + q.y() + " " + q.z() + " " + q.w());
    //     transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    //     platform.setWorldTransform(transform);
    // }

    return false;
});

window.addEventListener( 'keydown', function ( event ) {

    // console.log(ballBounds);

    switch ( event.keyCode ) {
        // D
        case 68:
            camera.position.y += 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,1,0));
            break;
        // A
        case 65:
            camera.position.y -= 1;
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,-1,0));
            // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
            break;
    }

} );

window.addEventListener( 'keyup', function () {

    console.log(camera.position.y - ball.position.y);
    // armMovement = 0;
    // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
    // console.log(cubeBounds);

} );
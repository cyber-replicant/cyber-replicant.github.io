// import * as THREE from 'three';

// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

// THREE basic constructs
let camera, clock, scene, renderer;

// THREE groups
let generalGroup, platformGroup, ballGroup;

// THREE objects
let base, ball, ballBounds, ballBody;
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
let totalScore = 0;
let comboScore = 0;
let scoreModifier = 1;

// The level at which the score was most recently reset
let lastScoreReset = 0;

let isGameOver = false;

let pointerDown = false;
let mouseX = 0, mouseY = 0;

let platforms = [];
let numDestroyChunksToSpawn = 3;
let numDoubleComboChunksToSpawn = 3;

const chunkSize = twoPi / 8;

const numPlatforms = 20;
const platformGapSize = 10;

const bounceVelocity = 15;

const useOrbitControls = false;

// At startup we create a dictionary of Material objects for each possible platform color
// These are used whenever the ball changes color
const ballMaterialCache = {};

const platformColors = [
    // // blue
    // {
    //     "color": 0x0066AF,
    //     "emissive": 0x003860,
    // },
    // // pink
    // {
    //     "color": 0xED217C,
    //     "emissive": 0xA81758,
    // },
    // // yellow
    // {
    //     "color": 0xD3D15B,
    //     "emissive": 0x686418,
    // },
    // // green
    // {
    //     "color": 0x16994A,
    //     "emissive": 0x094C22,
    // },

    // maroon
    {
        "color": 0x890D18,
        "emissive": 0x5B0B11,
    },
    // purple
    {
        "color": 0x3F0538,
        "emissive": 0x260322,
    },
    // orange
    {
        "color": 0xC9300C,
        "emissive": 0x912108,
    },
    // yellow
    {
        "color": 0xFFB638,
        "emissive": 0x685417,
    },
];

const destroyColor = {
    "color": 0x000000,
    "emissive": 0x01110c,
};

const doubleComboColor = {
    "color": 0xC0C0C0,
    "emissive": 0xB76C8C,
};

let ballColor = platformColors[0].color;

// ----------------------------------------------------------------------------------------------------------------
// Helpers functions
// ----------------------------------------------------------------------------------------------------------------

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomColor() {
    return Math.floor(Math.random() * ( 1 << 24 ));
}

function shuffleArray(array) {

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
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
    camera.position.y = 18;
    camera.position.x = 4;
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // if (useOrbitControls) {
    //     const orbit = new OrbitControls(camera, renderer.domElement);
    // }

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
    ballGroup = new THREE.Group();

    scene.add(generalGroup);
    scene.add(platformGroup);
    scene.add(ballGroup);

    // Central pillar
    setupPillar();

    // Platforms
    setupPlatforms();

    // Ball
    setupBall(scene);

    // Skybox
    setupSkybox();
}

function setupPillar() {

    // Middle pillar object
    const pillarGeometry = new THREE.CylinderGeometry(
        3, // radiusTop
        3, // radiusBottom
        400, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        twoPi // thetaLength
    );

    const pillarMaterial = new THREE.MeshPhongMaterial({
        color: 0x711C91,
        emissive: 0x380034,
        side: THREE.DoubleSide
    });

    let pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = -50;
    generalGroup.add(pillar);

    // Pillar base
    const baseRadius = 20;
    const baseHeight = 2;

    const baseGeometry = new THREE.CylinderGeometry(
        baseRadius, // radiusTop
        baseRadius, // radiusBottom
        baseHeight, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        twoPi // thetaLength
    );

    base = new THREE.Mesh(baseGeometry, pillarMaterial);
    base.position.y = numPlatforms * -platformGapSize;
    generalGroup.add(base);

    // Create physics object for base to stop the ball
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(baseRadius, baseHeight * 0.5, 50));
    baseShape.setMargin(collisionMargin);
    const baseBody = createRigidBody(base, baseShape, 0);
}

function setupSkybox() {

    const skyboxTexturePaths = [
        './static/skybox/skybox4.png', // right
        './static/skybox/skybox4.png', // left
        './static/skybox/skybox4.png',
        './static/skybox/skybox4.png', // bottom
        './static/skybox/skybox4.png',
        './static/skybox/skybox4.png', //back
    ];

    const materialArray = skyboxTexturePaths.map(image => {
        let texture = new THREE.TextureLoader().load(image);
        return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    });

    let material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
    let object = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000, 1, 1, 1 ), materialArray);
    object.position.set(0, 0, 0);
    generalGroup.add(object);
}

function setupBall(scene) {

    const ballMass = 5;
    const ballRadius = 1;

    const ballGeometry = new THREE.SphereGeometry(
        ballRadius, // radius
        32, // widthSegments
        16, // heightSegments
        0, // phiStart
        twoPi, // phiLength
        0, // thetaStart
        Math.PI // thetaLength
    )

    for (let colorData of platformColors) {

        const ballMaterial = new THREE.MeshPhongMaterial({
            color: colorData.color,
            emissive: colorData.emissive,
            side: THREE.DoubleSide,
            // flatShading: true
        });

        ballMaterialCache[colorData.color] = ballMaterial;
    }

    ballMaterialCache[destroyColor.color] = new THREE.MeshPhongMaterial({
        color: destroyColor.color,
        emissive: destroyColor.emissive,
        side: THREE.DoubleSide,
        // flatShading: true
    });

    // Create THREE ball object
    ball = new THREE.Mesh(ballGeometry, ballMaterialCache[ballColor]);
    ball.castShadow = true;
    ball.position.set(0, 10, 5);

    ballGroup.add(ball);

    // Create ball bounding box
    ballBounds = new THREE.Sphere(ball.position, ballRadius);

    // Create ball physics object
    const ballShape = new Ammo.btSphereShape(ballRadius);
    ballShape.setMargin(collisionMargin);

    ballBody = createRigidBody(ball, ballShape, ballMass);
    ballBody.setRestitution(1);
    ballBody.setLinearVelocity(new Ammo.btVector3(0, -10, 0));
    // body.setAngularFactor( 0, 1, 0 );
}

function setupPlatforms() {

    let destroyChunks = {};
    let doubleComboChunks = {};

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

    // Calculate where to randomly place destroy chunks
    while (numDoubleComboChunksToSpawn > 0) {

        // Never spawn a doulbe combo chunk in the top 5 platforms
        let platformIndex = getRandomInt(5,  numPlatforms - 1);

        if (platformIndex in doubleComboChunks) {
            continue;
        }

        doubleComboChunks[platformIndex] = true;
        numDoubleComboChunksToSpawn -= 1;
    }

    // Generate the chunks for each platform
    for (let i = 0; i < numPlatforms; i++) {

        let hasDestroyChunk = destroyChunks[i];
        let hasDoubleComboChunk = doubleComboChunks[i];
        generatePlatform(i * -platformGapSize, hasDestroyChunk, hasDoubleComboChunk);
    }
}

function generatePlatform(platformY, hasDestroyChunk, hasDoubleComboChunk) {

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

    const startPos = new THREE.Vector3(0, platformY, 5);

    const positions = [
        new THREE.Vector3(5, platformY, 0),
        new THREE.Vector3(5, platformY, -5),
        new THREE.Vector3(0, platformY, -5),
        new THREE.Vector3(-5, platformY, -5),
        new THREE.Vector3(-5, platformY, 0),
        new THREE.Vector3(-5, platformY, 5),
        new THREE.Vector3(0, platformY, 5),
        new THREE.Vector3(5, platformY, 5),
    ];

    // Remove a random amount of pie chunks from the platform
    let numChunksToRemove = getRandomInt(4, 6);

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

    // Generate array of chunk types
    let chunkColors = [];

    if (hasDestroyChunk) {
        chunkColors.push(destroyColor);
    }

    if (hasDoubleComboChunk) {
        chunkColors.push(doubleComboColor);
    }

    const numColorsToSelect = positions.length - chunkColors.length;
    const numColors = Object.keys(platformColors).length - 1;

    // [0, 1, 2, 3];

    for (let i = 0, il = positions.length - chunkColors.length; i < il; i++) {
        const colorIndex = getRandomInt(0, numColors);
        chunkColors.push(platformColors[colorIndex]);
    }

    shuffleArray(chunkColors);

    // Generate a platform chunk for each of the remaining positions
    for (let i = 0, il = positions.length; i < il; i++) {

        let colorData = chunkColors[i];
        generatePlatformChunk(rotations[i], positions[i], colorData);
    }
}

function generatePlatformChunk(rotationY, position, colorData) {

    // Generate the platform chunk by creating a cylinder
    const cylinderRadius = 9;
    const cylinderHeight = 2;

    const cylinderGeometry = new THREE.CylinderGeometry(
        cylinderRadius, // radiusTop
        cylinderRadius, // radiusBottom
        cylinderHeight, // height
        30, // radialSegments
        1, // heightSegments
        false, // openEnded
        0, // thetaStart
        chunkSize // thetaLength
    );

    const cylinderMaterial = new THREE.MeshPhongMaterial({
        color: colorData["color"],
        emissive: colorData["emissive"],
        side: THREE.DoubleSide,
    });

    const chunk = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    platformGroup.add(chunk);

    chunk.castShadow = true;
    chunk.receiveShadow = true;

    chunk.rotation.y = rotationY;
    chunk.position.y = position.y;

    let boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    let box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2, 1, 1, 1 ), boxMaterial);

    box.geometry.computeBoundingBox();
    box.position.copy(position);
    box.visible = false;

    box.userData.color = colorData.color;
    platformGroup.add(box);

    // Generate the bounding box for the platform chunk
    let cubeBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    cubeBounds.setFromObject(box);
    box.userData.cubeBounds = cubeBounds;
    box.userData.platformMesh = chunk;

    platforms.push(box);

    // Draw shapes to fill the sides of the pie chunk
    const chunkLeftEnd = cylinderRadius - 2.6;

    const points = new Float32Array([
        0, -1, 0,
        chunkLeftEnd, -1, chunkLeftEnd,
        0, 1, 0,

        chunkLeftEnd, -1, chunkLeftEnd,
        0, 1, 0,
        chunkLeftEnd, 1, chunkLeftEnd,

        0, -1, 0,
        0, -1, cylinderRadius,
        0, 1, 0,

        0, -1, cylinderRadius,
        0, 1, 0,
        0, 1, cylinderRadius,
    ]);

    const sidesGeometry = new THREE.BufferGeometry();

    sidesGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const sidesMaterial = new THREE.MeshBasicMaterial({
        color: colorData["color"],
        side: THREE.DoubleSide
    });
    const sides = new THREE.Mesh(sidesGeometry, sidesMaterial);
    chunk.add(sides);

    return chunk;
}

function createRigidBody(object, shape, mass) {

    const position = object.position;
    const quaternion = object.quaternion;

    const bodyTransform = new Ammo.btTransform();
    bodyTransform.setIdentity();
    bodyTransform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    bodyTransform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
    const motionState = new Ammo.btDefaultMotionState(bodyTransform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);

    const info = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new Ammo.btRigidBody(info);

    body.setFriction(0.5);
    object.userData.physicsBody = body;

    if (mass > 0) {

        rigidBodies.push(object);
        body.setActivationState(4); // Disable deactivation
    }

    physicsWorld.addRigidBody(body);
    return body;
}

function checkCollisions() {

    for (const platform of platforms) {

        const cubeBounds = platform.userData.cubeBounds;
        cubeBounds.copy(platform.geometry.boundingBox).applyMatrix4(platform.matrixWorld);

        // Bounce the ball if it intersects with any of the bounding cubes
        if (ballBounds.intersectsBox(cubeBounds)) {
            processPlatformCollision(platform);
        }
    }

    // if (ballBounds.intersects
}

function processPlatformCollision(platform) {

    const color = platform.userData.color;

    // Game over platform
    if (color === destroyColor.color) {
        totalScore += comboScore * scoreModifier;
        ball.material = ballMaterialCache[color];
        ballBody.setLinearVelocity(new Ammo.btVector3(0,2,0));
        document.getElementById("uiGameOver").style.display = "block";
        isGameOver = true;
    }
    // Bounce platforms
    else {
        if (color === doubleComboColor.color) {
            scoreModifier += 1;
        }
        // If the color doesn't match, change it and reset score
        else if (color !== ballColor) {
            ball.material = ballMaterialCache[color];
            ballColor = color;
            // base.material = ballMaterialCache[color];

            totalScore += comboScore;
            lastScoreReset = platform.position.y;
            scoreModifier = 1;
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
        }
        else {
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
        }

        // Remove the platform chunk
        platform.userData.platformMesh.visible = false;
        let index = platforms.indexOf(platform);
        platforms.splice(index, 1);
    }
}

function animate() {

    if (isGameOver) {
        return;
    }

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

    checkCollisions();

    render();
    requestAnimationFrame(animate);
}

function render() {

    const deltaTime = clock.getDelta();

    comboScore = 1+Math.floor((lastScoreReset - ball.position.y) / platformGapSize);
    document.getElementById("uiComboScore").innerHTML = comboScore;
    document.getElementById("uiTotalScore").innerHTML = totalScore;
    document.getElementById("uiScoreModifier").innerHTML = "x" + scoreModifier;

    updatePhysics(deltaTime);

    // Move camera to follow ball
    const triggerFollowDistance = 4;

    if (!useOrbitControls && camera.position.y - ball.position.y >= triggerFollowDistance) {

        // const velocity = ballBody.getLinearVelocity().y();
        // camera.position.y += (deltaTime * velocity) - 1;

        // cmaer
        console.log(camera.position.y - ball.position.y);
        camera.position.y -= 1;//+= deltaTime * velocity * 0.5;
        // camera.lookAt(ball.position);
    }

    renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {

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
        }
    }
}

window.addEventListener('resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


window.addEventListener('pointerdown', function(event) {

    event.preventDefault();

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    return false;
});

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

    platformGroup.rotation.y -= deltaX / 50;
    return false;
});



window.addEventListener('touchstart', function(event) {

    event.preventDefault();

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    return false;
});

window.addEventListener('touchend', function(event) {

    event.preventDefault();

    pointerDown = false;
    return false;
});

window.addEventListener('touchmove', function(event) {

    if (!pointerDown) {
        return;
    }

    event.preventDefault();

    let deltaX = event.clientX - mouseX;
    let deltaY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;

    platformGroup.rotation.y -= deltaX / 50;
    return false;
});

// window.addEventListener( 'keydown', function ( event ) {

//     switch ( event.keyCode ) {
//         // D
//         case 68:
//             // camera.position.y += 1;
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,1,0));
//             break;
//         // A
//         case 65:
//             camera.position.y -= 1;
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,-1,0));
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
//             break;
//     }

// } );

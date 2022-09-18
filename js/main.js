// import * as THREE from 'three';

// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;

// THREE basic constructs
let camera, clock, scene, renderer;

// THREE groups
let generalGroup, platformGroup, ballGroup;

// THREE objects
let base, baseBounds, ball, ballBounds, ballBody;
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
let previousComboScore = 0;
let comboScore = 0;
let scoreModifier = 1;

// The level at which the score was most recently reset
let lastScoreReset = 0;

let isGameOver = false;

let pointerDown = false;
let mouseX = 0, mouseY = 0;

// List of Audio objects matching the combo score
let comboSounds = [];

// List of active platforms that can be collided with
let platforms = [];
// List of platforms that can no longer be collided with, but are still busy animating the breaking process
let breakingPlatforms = [];

const chunkSize = twoPi / 8;
const platformGapSize = 12;

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
    // {
    //     "color": 0xC9300C,
    //     "emissive": 0x912108,
    // },
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
    "color": 0xffffff,
    "emissive": 0xB76C8C,
};

const crushColor = {
    "color": 0xB80D57,
    "emissive": 0x7F0A3D,
};

const searchParams = new URLSearchParams(window.location.search);

let level = 1;
let numPlatforms = 20;
let numDestroyChunksToSpawn = 2;
let numDoubleComboChunksToSpawn = 3;
let ballColor = platformColors[0].color;

if (searchParams.has("level")) {
    level = parseInt(searchParams.get("level"));

    // Add 10 extra platforms per level
    numPlatforms += (level - 1) * 10;

    numDestroyChunksToSpawn += level;
    numDoubleComboChunksToSpawn += level;

    let lastColor = searchParams.get("lastColor");

    for (const color of platformColors) {
        if (color.color === lastColor) {
            ballColor = lastColor;
            break;
        }
    }
}

const bounceVelocity = 12;

const useOrbitControls = false;

// At startup we create a dictionary of Material objects for each possible platform color
// These are used whenever the ball changes color
const ballMaterialCache = {};

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

    document.getElementById("uiLevel").innerHTML = "LEVEL " + level;

    setTimeout(() => {
        document.getElementById("uiLevel").style.display = "none";
        setupScene();
        animate();
    }, 1000);
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

    // setupParticles(scene);

    setupAudio();

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

let comboAudio = null;

function setupAudio() {

    comboSounds = [
        new Howl({ src: ['/static/audio/combo-01.wav'] }),
        new Howl({ src: ['/static/audio/combo-02.wav'] }),
        new Howl({ src: ['/static/audio/combo-03.wav'] }),
        new Howl({ src: ['/static/audio/combo-04.wav'] }),
        new Howl({ src: ['/static/audio/combo-05.wav'] }),
        new Howl({ src: ['/static/audio/combo-06.wav'] }),
        new Howl({ src: ['/static/audio/combo-07.wav'] }),
        new Howl({ src: ['/static/audio/combo-08.wav'] }),
        new Howl({ src: ['/static/audio/combo-09.wav'] }),
        new Howl({ src: ['/static/audio/combo-10.wav'] }),
        new Howl({ src: ['/static/audio/combo-11.wav'] }),
        new Howl({ src: ['/static/audio/combo-12.wav'] }),
        new Howl({ src: ['/static/audio/combo-13.wav'] }),
        new Howl({ src: ['/static/audio/combo-14.wav'] }),
        new Howl({ src: ['/static/audio/combo-15.wav'] }),
        new Howl({ src: ['/static/audio/combo-16.wav'] }),
        new Howl({ src: ['/static/audio/combo-17.wav'] }),
        new Howl({ src: ['/static/audio/combo-18.wav'] }),
    ];

    // comboSounds = [
    //     new Audio('/static/audio/combo-01.wav'),
    //     new Audio('/static/audio/combo-02.wav'),
    //     new Audio('/static/audio/combo-03.wav'),
    //     new Audio('/static/audio/combo-04.wav'),
    //     new Audio('/static/audio/combo-05.wav'),
    //     new Audio('/static/audio/combo-06.wav'),
    //     new Audio('/static/audio/combo-07.wav'),
    //     new Audio('/static/audio/combo-08.wav'),
    //     new Audio('/static/audio/combo-09.wav'),
    //     new Audio('/static/audio/combo-10.wav'),
    //     new Audio('/static/audio/combo-11.wav'),
    //     new Audio('/static/audio/combo-12.wav'),
    //     new Audio('/static/audio/combo-13.wav'),
    //     new Audio('/static/audio/combo-14.wav'),
    //     new Audio('/static/audio/combo-15.wav'),
    //     new Audio('/static/audio/combo-16.wav'),
    //     new Audio('/static/audio/combo-17.wav'),
    //     new Audio('/static/audio/combo-18.wav'),
    // ];

    // comboAudio = new Howl({
    //     src: ["/static/audio/combo.wav"],
    //     sprite: {
    //         combo01: [0, 500],
    //         combo02: [750, 1000],
    //         combo03: [1500, 1000],
    //     }
    // });
    // comboAudio.play('combo03');
    // comboAudio.preload = "auto";
}

function playComboSound(soundIndex) {

    // comboAudio.pause();
    // comboAudio.currentTime = soundIndex * 0.375;
    // comboAudio.play();

    let toPlay = null;

    for (let i = 0; i < comboSounds.length; i++) {

        const audio = comboSounds[i];

        if (soundIndex === i) {
            toPlay = audio;
            // let id = audio.play();
            // playingIds.push(id);
        } else {
            audio.mute();
            // audio.pause();
            // audio.currentTime = 0;
        }
    }

    toPlay.play();
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
        2000, // height
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
    pillar.position.y = -950;
    generalGroup.add(pillar);

    // Pillar base
    const baseRadius = 10;
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

    // const baseMaterial = new THREE.MeshPhongMaterial({
    //     color: 0xB80D57,
    //     emissive: 0x720935,
    //     side: THREE.DoubleSide
    // });

    base = new THREE.Mesh(baseGeometry, pillarMaterial);
    base.position.y = numPlatforms * -platformGapSize;
    generalGroup.add(base);

    // Create physics object for base to stop the ball
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(baseRadius, baseHeight * 0.5, 50));
    baseShape.setMargin(collisionMargin);
    const baseBody = createRigidBody(base, baseShape, 0);
    // baseBody.setFriction(0);

    // Create bounding box for the base so that we can detect the end game condition
    let boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    let boxGeometry = new THREE.BoxGeometry(20, 2, 20, 1, 1, 1 );
    let box = new THREE.Mesh(boxGeometry, boxMaterial);

    box.geometry.computeBoundingBox();
    box.position.copy(base.position);
    box.visible = false;
    generalGroup.add(box);

    // Generate the bounding box for the platform chunk
    baseBounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    baseBounds.setFromObject(box);
}


function randomVelocity() {
    var dx = 0.001 + 0.003*Math.random();
    var dy = 0.001 + 0.003*Math.random();
    var dz = 0.001 + 0.003*Math.random();
    if (Math.random() < 0.5) {
        dx = -dx;
    }
    if (Math.random() < 0.5) {
        dy = -dy;
    }
    if (Math.random() < 0.5) {
        dz = -dz;
    }
    return new THREE.Vector3(dx,dy,dz);
}


function setupParticles(scene) {

    var MAX_POINTS = 500;
    var pointsInUse = 2500;

    let points = new Array(MAX_POINTS);
    let spinSpeeds = new Array(MAX_POINTS);
    let driftSpeeds = new Array(MAX_POINTS);
    let pointsBuffer = new Float32Array( 3*MAX_POINTS );
    let colorBuffer = new Float32Array( 3*MAX_POINTS );
    var i = 0;
    var yaxis = new THREE.Vector3(0,1,0);
    while (i < MAX_POINTS) {
        var x = 2*Math.random() - 1;
        var y = 2*Math.random() - 1;
        var z = 2*Math.random() - 1;
        if ( x*x + y*y + z*z < 1 ) {  // only use points inside the unit sphere
            var angularSpeed = 0.001 + Math.random()/50;  // angular speed of rotation about the y-axis
            spinSpeeds[i] = new THREE.Quaternion();
            spinSpeeds[i].setFromAxisAngle(yaxis,angularSpeed);  // The quaternian for rotation by angularSpeed radians about the y-axis.
            driftSpeeds[i] = randomVelocity();
            points[i] = new THREE.Vector3(x,y,z);
         pointsBuffer[3*i] = x;
         pointsBuffer[3*i+1] = y;
         pointsBuffer[3*i+2] = z;
         colorBuffer[3*i] = 0.25 + 0.75*Math.random();
         colorBuffer[3*i+1] = 0.25 + 0.75*Math.random();
         colorBuffer[3*i+2] = 0.25 + 0.75*Math.random();
            i++;
        }
    }
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pointsBuffer,3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffer,3));
    geometry.setDrawRange(0,pointsInUse);
    let material = new THREE.PointsMaterial({
            color: "yellow",
            size: 2,
            sizeAttenuation: false
        });
    let pointCloud = new THREE.Points(geometry,material);
    scene.add(pointCloud);
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

    // let material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
    let object = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000, 1, 1, 1 ), materialArray);
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
        color: colorData.color,
        emissive: colorData.emissive,
        side: THREE.DoubleSide,
    });

    // if (colorData.color === doubleComboColor.color) {
    //     cylinderMaterial.transparent = true;
    //     cylinderMaterial.opacity = 0.7;
    // }

    const chunk = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    platformGroup.add(chunk);

    chunk.castShadow = true;
    chunk.receiveShadow = true;

    chunk.rotation.y = rotationY;
    chunk.position.y = position.y;

    let boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    let boxGeometry = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1 );
    let box = new THREE.Mesh(boxGeometry, boxMaterial);

    box.geometry.computeBoundingBox();
    box.position.copy(position);
    box.visible = false;

    box.userData.color = colorData.color;
    platformGroup.add(box);

    // let pointsMaterial = new THREE.PointsMaterial({
    //     color: colorData.color,
    //     size: 5,
    //     sizeAttenuation: false
    // });
    // let pointCloud = new THREE.Points(boxGeometry, pointsMaterial);
    // platformGroup.add(pointCloud);

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
    chunk.userData.sides = sides;

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

            // Don't allow colliding with multiple platforms at the same time
            break;
        }
    }

    if (ballBounds.intersectsBox(baseBounds)) {
        totalScore += comboScore * scoreModifier;
        // document.getElementById("uiScoreContainer").style.display = "none";
        document.getElementById("uiWinScore").innerHTML = "SCORE " + totalScore;
        document.getElementById("uiGameSuccess").style.display = "block";
        document.getElementById("nextLevelButton").href = "/?level=" + (level + 1) + "&lastColor=" + ballColor;
        isGameOver = true;
    }
}

function processPlatformCollision(platform) {

    const color = platform.userData.color;
    const velocity = ballBody.getLinearVelocity().y();
    let breakPlatform = true;

    // Prevents platforms from hopping the ball by side-swiping
    // if (ball.position.y <= platform.position.y) {
    //     return;
    // }

    // Game over platform
    if (color === destroyColor.color && velocity >= -40) {
        totalScore += comboScore * scoreModifier;
        ball.material = ballMaterialCache[color];
        ballBody.setLinearVelocity(new Ammo.btVector3(0, 2, 0));
        // document.getElementById("uiScoreContainer").style.display = "none";
        document.getElementById("uiLoseScore").innerHTML = "SCORE " + totalScore;
        document.getElementById("uiGameOver").style.display = "block";
        isGameOver = true;
        breakPlatform = false;
    }
    // Bounce platforms
    else {
        if (color === doubleComboColor.color) {

            // ballBody.setLinearVelocity(new Ammo.btVector3(0, velocity - 5, 0));
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            scoreModifier += 1;
        }
        // If the color doesn't match, change it and reset score
        else if (color !== ballColor) {

            if (color !== destroyColor.color) {
                ball.material = ballMaterialCache[color];
                ballColor = color;
            }

            totalScore += comboScore * scoreModifier;
            lastScoreReset = platform.position.y;
            scoreModifier = 1;
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            breakPlatform = false;
        }
        // If the color matches, only bounce
        else {
            ballBody.setLinearVelocity(new Ammo.btVector3(0, bounceVelocity, 0));
            breakPlatform = false;
        }
    }

    if (breakPlatform) {
        // Remove the platform chunk
        // platform.userData.platformMesh.visible = false;
        let index = platforms.indexOf(platform);
        platforms.splice(index, 1);

        let mesh = platform.userData.platformMesh;
        mesh.material.transparent = true;
        mesh.userData.sides.material.transparent = true;
        breakingPlatforms.push(platform);
    }
}

function animate() {

    ballBounds.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

    render();
    requestAnimationFrame(animate);
}

function render() {

    const deltaTime = clock.getDelta();

    comboScore = 1 + Math.floor((lastScoreReset - ball.position.y) / platformGapSize);

    // Every time the score increases, play the next sound
    if (previousComboScore !== comboScore) {
        previousComboScore = comboScore;
        let soundIndex = comboScore - 1;
        console.log(soundIndex);

        if (comboScore > 0 && soundIndex < comboSounds.length) {
            playComboSound(soundIndex);
            // comboSounds[soundIndex].play();
        }
    }

    document.getElementById("uiComboScore").innerHTML = comboScore;
    document.getElementById("uiTotalScore").innerHTML = totalScore;
    document.getElementById("uiScoreModifier").innerHTML = "x" + scoreModifier;

    if (!isGameOver) {
        checkCollisions();
        updatePhysics(deltaTime);
    }

    for (let platform of breakingPlatforms) {

        let mesh = platform.userData.platformMesh;
        let sides = mesh.userData.sides;

        let opacityChange = deltaTime * 3;
        mesh.material.opacity -= opacityChange;
        sides.material.opacity -= opacityChange;

        if (mesh.material.opacity <= 0) {

            mesh.visible = false;
            let index = breakingPlatforms.indexOf(platform);
            breakingPlatforms.splice(index, 1);
        }
    }

    // Move camera to follow ball
    const cameraDistanceFromBall = 5;

    if (camera.position.y - cameraDistanceFromBall > ball.position.y) {
        camera.position.y = ball.position.y + cameraDistanceFromBall;
    }
    // const triggerFollowDistance = 4;

    // if (!useOrbitControls && camera.position.y - ball.position.y >= triggerFollowDistance) {

    //     camera.position.y = ball.position.y
    //     // const velocity = ballBody.getLinearVelocity().y();
    //     // camera.position.y += (deltaTime * velocity) - 1;

    //     // cmaer
    //     // console.log(camera.position.y - ball.position.y);
    //     // camera.position.y -= 1;//+= deltaTime * velocity * 0.5;
    //     // camera.lookAt(ball.position);
    // }

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


// window.addEventListener('pointerdown', function(event) {

//     pointerDown = true;
//     mouseX = event.clientX;
//     mouseY = event.clientY;
// });

// window.addEventListener('pointerup', function(event) {

//     pointerDown = false;
// });

// window.addEventListener('pointermove', function(event) {

//     if (!pointerDown || isGameOver) {
//         return;
//     }

//     let deltaX = event.clientX - mouseX;
//     let deltaY = event.clientY - mouseY;
//     mouseX = event.clientX;
//     mouseY = event.clientY;

//     platformGroup.rotation.y += deltaX / 20;
// });

window.addEventListener('touchstart', function(event) {

    pointerDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
});

window.addEventListener('touchend', function(event) {

    pointerDown = false;
});

window.addEventListener('touchmove', function(event) {

    if (!pointerDown || isGameOver) {
        return;
    }

    let deltaX = event.clientX - mouseX;
    let deltaY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;

    platformGroup.rotation.y += deltaX / 20;
});


// window.addEventListener( 'keydown', function ( event ) {

//     switch ( event.keyCode ) {
//         // D
//         case 68:
//             comboAudio.play('combo02');
//             // camera.position.y += 10;
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,1,0));
//             break;
//         // A
//         case 65:
//             comboAudio.play('combo01');
//             // camera.position.y -= 10;
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,-1,0));
//             // arm.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
//             break;
//     }

// } );

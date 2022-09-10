import {
    BoxGeometry,
    BufferGeometry,
    CapsuleGeometry,
    CircleGeometry,
    Color,
    ConeGeometry,
    Curve,
    CylinderGeometry,
    DodecahedronGeometry,
    DoubleSide,
    ExtrudeGeometry,
    Float32BufferAttribute,
    Group,
    IcosahedronGeometry,
    LatheGeometry,
    LineSegments,
    LineBasicMaterial,
    Mesh,
    MeshPhongMaterial,
    OctahedronGeometry,
    PerspectiveCamera,
    PlaneGeometry,
    PointLight,
    RingGeometry,
    Scene,
    Shape,
    ShapeGeometry,
    SphereGeometry,
    TetrahedronGeometry,
    TorusGeometry,
    TorusKnotGeometry,
    TubeGeometry,
    Vector2,
    Vector3,
    WireframeGeometry,
    WebGLRenderer
} from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const twoPi = Math.PI * 2;


function torusdddGeometry( mesh ) {

    const data = {
        radius: 10,
        tube: 3,
        radialSegments: 16,
        tubularSegments: 100,
        arc: twoPi
    };

    function generateGeometry() {

        updateGroupGeometry( mesh,
            new TorusGeometry(
                data.radius, data.tube, data.radialSegments, data.tubularSegments, data.arc
            )
        );

    }

    generateGeometry();

}

function doGeometry( mesh ) {

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

    function generateGeometry() {

        mesh.children[0].geometry = new CylinderGeometry(
            data.radiusTop,
            data.radiusBottom,
            data.height,
            data.radialSegments,
            data.heightSegments,
            data.openEnded,
            data.thetaStart,
            data.thetaLength
        );

    }

    // const folder = gui.addFolder( 'THREE.CylinderGeometry' );

    // folder.add( data, 'radiusTop', 0, 30 ).onChange( generateGeometry );
    // folder.add( data, 'radiusBottom', 0, 30 ).onChange( generateGeometry );
    // folder.add( data, 'height', 1, 50 ).onChange( generateGeometry );
    // folder.add( data, 'radialSegments', 3, 64 ).step( 1 ).onChange( generateGeometry );
    // folder.add( data, 'heightSegments', 1, 64 ).step( 1 ).onChange( generateGeometry );
    // folder.add( data, 'openEnded' ).onChange( generateGeometry );
    // folder.add( data, 'thetaStart', 0, twoPi ).onChange( generateGeometry );
    // folder.add( data, 'thetaLength', 0, twoPi ).onChange( generateGeometry );


    generateGeometry();

}

// const gui = new GUI();

const scene = new Scene();
scene.background = new Color( 0x444444 );

const camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
camera.position.y = 30;
camera.position.z = 30;

const renderer = new WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const orbit = new OrbitControls( camera, renderer.domElement );
// orbit.enableZoom = false;

const lights = [];
lights[ 0 ] = new PointLight( 0xffffff, 1, 0 );
lights[ 1 ] = new PointLight( 0xffffff, 1, 0 );
lights[ 2 ] = new PointLight( 0xffffff, 1, 0 );

lights[ 0 ].position.set( 0, 200, 0 );
lights[ 1 ].position.set( 100, 200, 100 );
lights[ 2 ].position.set( - 100, - 200, - 100 );

scene.add( lights[ 0 ] );
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );

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

const cylinderGeometry = new CylinderGeometry(
    data.radiusTop,
    data.radiusBottom,
    data.height,
    data.radialSegments,
    data.heightSegments,
    data.openEnded,
    data.thetaStart,
    data.thetaLength
);

const torusData = {
    radius: 6,
    tube: 3,
    radialSegments: 2,
    tubularSegments: 40,
    arc: twoPi
};

const torusGeometry = new TorusGeometry(
    torusData.radius, torusData.tube, torusData.radialSegments, torusData.tubularSegments, torusData.arc
);

const geometry = new BufferGeometry();
geometry.setAttribute( 'position', new Float32BufferAttribute( [], 3 ) );

const lineMaterial = new LineBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.5 } );
const meshMaterial = new MeshPhongMaterial( { color: 0x156289, emissive: 0x072534, side: DoubleSide, flatShading: true } );

// group.add( new LineSegments( geometry, lineMaterial ) );
const group = new Group();
group.add( new Mesh( cylinderGeometry, meshMaterial ) );

const torusGroup = new Group();
torusGroup.add( new Mesh( torusGeometry, meshMaterial ) );
torusGroup.rotation.x = Math.PI / 2;

// Ball

const sphereData = {
    radius: 1.5,
    widthSegments: 32,
    heightSegments: 16,
    phiStart: 0,
    phiLength: twoPi,
    thetaStart: 0,
    thetaLength: Math.PI
};

const sphereGeometry = new SphereGeometry(
    sphereData.radius, sphereData.widthSegments, sphereData.heightSegments,
    sphereData.phiStart, sphereData.phiLength, sphereData.thetaStart, sphereData.thetaLength
)

// const ballMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const sphere = new Mesh( sphereGeometry, meshMaterial );
sphere.position.x = 5;
sphere.position.y = 5;

const ballGroup = new Group();
ballGroup.add( sphere );
// ballGroup.position.x = 1;

// doGeometry( group );

scene.add( group );
scene.add( torusGroup );
scene.add( ballGroup );

function render() {

    requestAnimationFrame( render );

    renderer.render( scene, camera );

}

window.addEventListener( 'resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}, false );

render();

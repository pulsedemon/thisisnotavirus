var renderer, scene, camera, mesh, geometry;
var sphere, uniforms, attributes;

init();
animate();

function init(){
  var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 1,
      FAR = 10000;

  camera = new THREE.PerspectiveCamera(
    VIEW_ANGLE,
    ASPECT,
    NEAR,
    FAR
  );
  camera.position.z = 300;

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1 } );
  renderer.setSize(WIDTH, HEIGHT);

  $('#container').append(renderer.domElement);

  var radius1 = 100, segments1 = 34.9151935428381, rings1 = 8.867045894265175;
  var geometry1 = new THREE.SphereGeometry( radius1, segments1, rings1 );
  var texture1 = new THREE.Texture( createImage() );
  texture1.needsUpdate = true;
  var material1 = new THREE.MeshBasicMaterial( { map: texture1, wireframe: true } )
  mesh1 = new THREE.Mesh( geometry1, material1);
  scene.add( mesh1 );

  window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  var time = Date.now() * 0.005;

  mesh1.rotation.y = 0.02 * time;
  mesh1.rotation.z = 0.02 * time;


  if(!window.texture2_image) {
    var radius2 = 50, segments2 = 20, rings2 = 2;
    var geometry2 = new THREE.SphereGeometry( radius2, segments2, rings2 );
    console.log(geometry2);
    window.texture2_image = createImage();
    var texture2 = new THREE.Texture( texture2_image );
    console.log(texture2);
    texture2.needsUpdate = true;
    window.material2 = new THREE.MeshBasicMaterial( { map: texture2, wireframe: true, needsUpdate: true } )
    var mesh2 = new THREE.Mesh( geometry2, material2);

    console.log(material2);
    scene.add( mesh2 );
  }

  var rand = Math.ceil((Math.random()*20)+1);

  if(rand < 5) {
    window.material2.color.setRGB((Math.random() * 256 ), (Math.random() * 256 ), (Math.random() * 256 ));
  }

  renderer.render( scene, camera );

}

function createImage() {

        var canvas = document.createElement( 'canvas' );
        canvas.width = 256;
        canvas.height = 256;

        var context = canvas.getContext( '2d' );
        context.fillStyle = 'rgb(' + Math.floor( Math.random() * 256 ) + ',' + Math.floor( Math.random() * 256 ) + ',' + Math.floor( Math.random() * 256 ) + ')';
        context.fillRect( 0, 0, 256, 256 );

        return canvas;

      }


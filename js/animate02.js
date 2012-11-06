var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

var renderer, scene, camera, mesh, geometry;
var sphere, uniforms, attributes;
var $container = $('#container');
var vc1;

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
  // var radius2 = 60, segments2 = 7 , rings2 = 1;



  geometry1 = new THREE.SphereGeometry( radius1, segments1, rings1 );
  var texture1 = new THREE.Texture( createImage() );
  texture1.needsUpdate = true;
  var material1 = new THREE.MeshBasicMaterial( { map: texture1, wireframe: true } )
  mesh1 = new THREE.Mesh( geometry1, material1);
  scene.add( mesh1 );

// texture.deallocate();

        // mesh.deallocate();
        // mesh.geometry.deallocate();
        // mesh.material.deallocate();

        // renderer.deallocateObject( mesh );
        // renderer.deallocateTexture( texture );
  // vc1 = geometry.vertices.length;

  // // var geometry2 = new THREE.CubeGeometry( 0.8 * radius, 0.8 * radius, 0.8 * radius, 10, 10, 10 );

  // // THREE.GeometryUtils.merge( geometry, geometry2 );

  // sphere = new THREE.ParticleSystem( geometry, shaderMaterial );

  // sphere.dynamic = true;
  // sphere.sortParticles = true;

  // var vertices = sphere.geometry.vertices;
  // var values_size = attributes.size.value;
  // var values_color = attributes.ca.value;

  // for( var v = 0; v < vertices.length; v++ ) {
  //   values_size[ v ] = 5;
  //   values_color[ v ] = new THREE.Color( 0xffffff );

  //   if ( v < vc1 ) {
  //     values_color[ v ].setHSV( 0.01 + 0.1 * ( v / vc1 ), 0.99, ( vertices[ v ].y + radius ) / ( 2 *radius ) );
  //   } else {
  //     values_size[ v ] = 40;
  //     values_color[ v ].setHSV( 0.6, 0.75, 0.5 + vertices[ v ].y / ( 0.8 * radius ) );
  //   }
  // }


  // scene.add(sphere);


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
    var radius2 = 50, segments2 = Math.random() * 64, rings2 = Math.random() * 32;
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

  // scene.remove( mesh2 );

        //

  // texture2.deallocate();

  // mesh2.deallocate();
  // mesh2.geometry2.deallocate();
  // mesh2.material2.deallocate();

  // renderer.deallocateObject( mesh2 );
  // renderer.deallocateTexture( texture2 );




  // // for( var i = 0; i < attributes.size.value.length; i ++ ) {

  //   // if ( i < vc1 )
  //     // attributes.size.value[ i ] = 16 + 12 * Math.sin( 0.1 * i + time );


  // // }

  // // attributes.size.needsUpdate = true;

  //
  // var geometry = new THREE.SphereGeometry( 50, Math.random() * 64, Math.random() * 32 );

  //       var texture = new THREE.Texture( createImage() );
  //       texture.needsUpdate = true;

  //       var material = new THREE.MeshBasicMaterial( { map: texture, wireframe: true } )

  //       var mesh = new THREE.Mesh( geometry, material );

  //       scene.add( mesh );

  //       renderer.render( scene, camera );

  //       scene.remove( mesh );

  //       //

  //       texture.deallocate();

  //       mesh.deallocate();
  //       mesh.geometry.deallocate();
  //       mesh.material.deallocate();

  //       renderer.deallocateObject( mesh );
  //       renderer.deallocateTexture( texture );

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
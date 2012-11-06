<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8">
	<title>THISISNOTAVIRUS</title>
	<link rel="stylesheet" href="css/style.css" type="text/css" media="screen">
	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
	<script src="js/three.min.js"></script>

</head>
<body>
	<div id="container"></div>

<script type="x-shader/x-vertex" id="vertexshader">
  attribute float size;
  attribute vec3 ca;

  varying vec3 vColor;

  void main() {

    vColor = ca;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    //gl_PointSize = size;
    gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );

    gl_Position = projectionMatrix * mvPosition;

  }
</script>

<script type="x-shader/x-fragment" id="fragmentshader">
  uniform vec3 color;
  uniform sampler2D texture;

  varying vec3 vColor;

  void main() {

    gl_FragColor = vec4( color * vColor, 1.0 );
    gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );

  }
</script>

<script src="js/animate02.js"></script>
</body>
</html>
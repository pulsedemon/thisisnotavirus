function log() {
  try {
    console.log.apply(console, arguments);
  }
  catch(e) { }
}

if(!Detect) { var Detect = {}; }
Detect.mobile = function(){
  log('mobile');
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
}

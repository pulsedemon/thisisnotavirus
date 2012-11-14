(function(root){

  "use strict";

  var Detect = root.Detect = {
    type: ''
  };

  Detect.device = function(){
    var test_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

    if(test_mobile){
      this.type = 'mobile';
    }
    else {
      this.type = 'desktop';
    }
  }

})(this);

function log() {
  try {
    console.log.apply(console, arguments);
  }
  catch(e) { }
}

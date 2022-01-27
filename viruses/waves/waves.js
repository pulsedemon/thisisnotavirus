new SineWaves({
  // Canvas Element
  el: document.getElementById('waves'),

  // General speed of entire wave system
  speed: 8,

  // How many degress should we rotate all of the waves
  rotate: 0,

  // Ease function from left to right
  // ease: 'Linear',
  ease: 'SineInOut',

  // Specific how much the width of the canvas the waves should be
  // This can either be a number or a percent
  waveWidth: '100%',

  // An array of wave options
  waves: [
    {
      timeModifier: 1,
      lineWidth: 1,
      amplitude: 150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 5,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(255, 255, 255, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -100,
      wavelength: 200,
      segmentLength: 1,
      type: 'sine',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },

  ],

  // Perform any additional initializations here
  initialize: function (){},

  resizeEvent: function() {
    // var gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    // gradient.addColorStop(0,"rgba(0, 0, 0, 1)");
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    //
    // var index = -1;
    // var length = this.waves.length;
    // while(++index < length){
    //   this.waves[index].strokeStyle = gradient;
    // }
    //
    // // Clean Up
    // index = void 0;
    // length = void 0;
    // gradient = void 0;
  }
});

new SineWaves({
  // Canvas Element
  el: document.getElementById('waves2'),

  // General speed of entire wave system
  speed: 8,

  // How many degress should we rotate all of the waves
  rotate: 0,


  // Ease function from left to right
  // ease: 'Linear',
  ease: 'SineInOut',

  // Specific how much the width of the canvas the waves should be
  // This can either be a number or a percent
  waveWidth: '100%',

  // An array of wave options
  waves: [
    {
      timeModifier: 1,
      lineWidth: 1,
      amplitude: 150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 5,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(255, 255, 255, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -100,
      wavelength: 200,
      segmentLength: 1,
      type: 'sine',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },

  ],

  // Perform any additional initializations here
  initialize: function (){},

  resizeEvent: function() {
    // var gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    // gradient.addColorStop(0,"rgba(0, 0, 0, 1)");
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    //
    // var index = -1;
    // var length = this.waves.length;
    // while(++index < length){
    //   this.waves[index].strokeStyle = gradient;
    // }
    //
    // // Clean Up
    // index = void 0;
    // length = void 0;
    // gradient = void 0;
  }
});

new SineWaves({
  // Canvas Element
  el: document.getElementById('waves3'),

  // General speed of entire wave system
  speed: 8,

  // How many degress should we rotate all of the waves
  rotate: 90,

  // Ease function from left to right
  // ease: 'Linear',
  ease: 'SineInOut',

  // Specific how much the width of the canvas the waves should be
  // This can either be a number or a percent
  waveWidth: '100%',

  // An array of wave options
  waves: [
    {
      timeModifier: 1,
      lineWidth: 1,
      amplitude: 150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },
    {
      timeModifier: 5,
      lineWidth: 1,
      amplitude: -150,
      wavelength: 100,
      segmentLength: 1,
      type: 'Sawtooth',
      strokeStyle: 'rgba(255, 255, 255, 1)',
    },
    {
      timeModifier: 2,
      lineWidth: 1,
      amplitude: -100,
      wavelength: 200,
      segmentLength: 1,
      type: 'sine',
      strokeStyle: 'rgba(0, 0, 0, 1)',
    },

  ],

  // Perform any additional initializations here
  initialize: function (){},

  resizeEvent: function() {
    // var gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    // gradient.addColorStop(0,"rgba(0, 0, 0, 1)");
    // gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
    //
    // var index = -1;
    // var length = this.waves.length;
    // while(++index < length){
    //   this.waves[index].strokeStyle = gradient;
    // }
    //
    // // Clean Up
    // index = void 0;
    // length = void 0;
    // gradient = void 0;
  }
});

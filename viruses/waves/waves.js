const wavesList = [
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

];

new SineWaves({
  el: document.getElementById('waves'),
  speed: 8,
  rotate: 0,
  ease: 'SineOut',
  waveWidth: '100%',
  waves: wavesList,
});

new SineWaves({
  el: document.getElementById('waves2'),
  speed: 8,
  rotate: 0,
  ease: 'SineIn',
  waveWidth: '100%',
  waves: wavesList,
});

new SineWaves({
  el: document.getElementById('waves3'),
  speed: 8,
  rotate: 90,
  ease: 'SineInOut',
  waveWidth: '100%',
  waves: wavesList,
});

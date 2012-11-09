function log() {
  try {
    console.log.apply(console, arguments);
  }
  catch(e) { }
}
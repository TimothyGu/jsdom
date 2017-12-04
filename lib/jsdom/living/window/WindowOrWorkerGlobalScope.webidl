typedef (DOMString or Function) TimerHandler;

[NoInterfaceObject, Exposed=(Window,Worker)]
interface WindowOrWorkerGlobalScope {
  // [Replaceable] readonly attribute USVString origin;

  // base64 utility methods
  DOMString btoa(DOMString data);
  ByteString atob(DOMString data);

  // timers
  long setTimeout(TimerHandler handler, optional long timeout = 0, any... arguments);
  void clearTimeout(optional long handle = 0);
  long setInterval(TimerHandler handler, optional long timeout = 0, any... arguments);
  void clearInterval(optional long handle = 0);

  // ImageBitmap
  // Promise<ImageBitmap> createImageBitmap(ImageBitmapSource image, optional ImageBitmapOptions options);
  // Promise<ImageBitmap> createImageBitmap(ImageBitmapSource image, long sx, long sy, long sw, long sh, optional ImageBitmapOptions options);
};
Window implements WindowOrWorkerGlobalScope;
// WorkerGlobalScope implements WindowOrWorkerGlobalScope;

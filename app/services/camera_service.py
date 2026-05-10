import cv2
import threading
import time

class CameraManager:
    """
    Manages camera resources using a singleton-like pattern with reference counting.
    Provides a thread-safe, non-blocking way to capture frames by running 
    a background reading thread to ensure the latest frame is always available.
    """
    def __init__(self):
        """Initializes the camera manager with thread safety locks and default states."""
        self.cap = None
        self.lock = threading.Lock()
        self.ref_count = 0 
        self.frame = None
        self.success = False
        self.running = False
        self._thread = None

    def _reader(self):
        """
        Internal worker method that runs in a background thread.
        Continuously reads frames from the camera to prevent buffer lag.
        """
        while self.running:
            if self.cap and self.cap.isOpened():
                success, frame = self.cap.read()
                if success:
                    with self.lock:
                        self.frame = frame
                        self.success = True
                else:
                    time.sleep(0.01) 
            else:
                break

    def start(self):
        """
        Increments the reference count and initializes the camera if not already active.
        Starts a background thread to continuously capture frames.
        """
        with self.lock:
            if self.cap is None or not self.cap.isOpened():
                print("[Camera] Initializing camera device...")
                target_index = 0 
                
                self.cap = cv2.VideoCapture(target_index, cv2.CAP_DSHOW)
                #self.cap = cv2.VideoCapture(target_index)
                
                if not self.cap.isOpened():
                    print(f"[Camera] Індекс {target_index} не знайдено, пробуємо 0...")
                    self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

                if not self.cap.isOpened():
                    self.cap = cv2.VideoCapture(0)
                
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

                self.running = True
                self._thread = threading.Thread(target=self._reader, daemon=True)
                self._thread.start()

            self.ref_count += 1
            print(f"[Camera] Connection active. Reference count: {self.ref_count}")

    def stop(self):
        """
        Decrements the reference count and releases camera resources 
        only if no active users remain.
        """
        with self.lock:
            if self.ref_count > 0:
                self.ref_count -= 1
                
            if self.ref_count <= 0:
                print("[Camera] No active users. Releasing camera resources...")
                self.running = False
                if self._thread:
                    self._thread.join(timeout=1.0)
                if self.cap:
                    self.cap.release()
                self.cap = None
                self.frame = None
                self.success = False
                self.ref_count = 0

    def get_frame(self):
        """
        Retrieves the most recent frame captured by the background thread.

        Returns:
            tuple: (bool success, numpy.ndarray frame) where success indicates 
            if a valid frame was retrieved.
        """
        with self.lock:
            return self.success, self.frame if self.frame is None else self.frame.copy()
        

camera_manager = CameraManager()
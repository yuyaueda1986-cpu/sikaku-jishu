class ScreenManager {
  constructor(doc) {
    this._doc = doc || document;
    this._screens = this._doc.querySelectorAll('.screen');
    this._currentScreen = this._findActiveScreen();
    this._callbacks = [];
  }

  _findActiveScreen() {
    for (const screen of this._screens) {
      if (screen.classList.contains('active')) {
        return screen.id;
      }
    }
    return null;
  }

  showScreen(screenId) {
    const target = this._doc.getElementById(screenId);
    if (!target) return;

    for (const screen of this._screens) {
      screen.classList.remove('active');
    }
    target.classList.add('active');
    this._currentScreen = screenId;

    for (const cb of this._callbacks) {
      cb(screenId);
    }
  }

  getCurrentScreen() {
    return this._currentScreen;
  }

  onScreenChange(callback) {
    this._callbacks.push(callback);
  }
}

export { ScreenManager };

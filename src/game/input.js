const KEY_MAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  Space: "jump",
};

export class Input {
  constructor(touchControls) {
    this.touchControls = touchControls;
    this.keys = {
      left: false,
      right: false,
      up: false,
      jump: false,
    };
    this.justPressed = new Set();

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.setupTouchControls();
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  setupTouchControls() {
    if (!this.touchControls) {
      return;
    }

    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
    this.touchControls.classList.toggle("is-visible", coarse);
    this.touchControls.setAttribute("aria-hidden", coarse ? "false" : "true");

    for (const button of this.touchControls.querySelectorAll("[data-touch]")) {
      const action = button.getAttribute("data-touch");
      const press = (event) => {
        event.preventDefault();
        this.press(action);
      };
      const release = (event) => {
        event.preventDefault();
        this.release(action);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    }
  }

  onKeyDown(event) {
    const action = KEY_MAP[event.code];
    if (!action) {
      return;
    }
    event.preventDefault();
    this.press(action);
  }

  onKeyUp(event) {
    const action = KEY_MAP[event.code];
    if (!action) {
      return;
    }
    event.preventDefault();
    this.release(action);
  }

  onBlur() {
    for (const key of Object.keys(this.keys)) {
      this.keys[key] = false;
    }
    this.justPressed.clear();
  }

  press(action) {
    if (!this.keys[action]) {
      this.justPressed.add(action);
    }
    this.keys[action] = true;
  }

  release(action) {
    this.keys[action] = false;
  }

  consume(action) {
    const pressed = this.justPressed.has(action);
    this.justPressed.delete(action);
    return pressed;
  }
}

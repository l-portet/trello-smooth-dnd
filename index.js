const SETTINGS = {
  smooth: true,
  animateEnd: true,
  transformOriginMode: 'mouse', // or 'center'
  scale: 1.1,
  rotationOffset: {
    min: 1.2,
    max: 2
  },
  rotationMitigation: 0.2,
  debug: {
    dataInspector: false
  }
}


new Vue({
  el: '#app',
  data: {
    mousePos: {
      x: -1000,
      y: -1000
    },
    lastMousePos: { x: 0, y: 0 },
    draggedCardIdx: -1,
    paneOverlappedIdx: -1,
    ghostCardStyle: {
      leaving: false,
      pos: {
        x: 0,
        y: 0
      },
      width: 0,
      cursorDistance: {
        x: 0,
        y: 0
      },
      percentDistanceMiddle: 0,
      transform: '',
      transformOrigin: '',
      velocity: 0,
      rotation: 0
    },
    cards: [
      {
        name: 'Something',
        paneIndex: 0
      }
    ],
    panes: [
      {
        name: 'To do'
      },
      {
        name: 'Doing'
      },
      {
        name: 'Done'
      }
    ],
    settings: SETTINGS,
    settingsExpanded: false
  },
  computed: {
    filledPanes() {
      let filledPanes = this.panes.map(item => ({ name: item.name }));

      for (let i = 0; i < this.cards.length; i++) {
        let pane = filledPanes[this.cards[i].paneIndex];

        if (!pane.cards) pane.cards = [];
        pane.cards.push({ ...this.cards[i], index: i });
      }

      return filledPanes;
    },
    draggedCard() {
      return this.cards[this.draggedCardIdx] || { name: '' };
    }
  },
  methods: {
    onDragStart(e, index) {
      let cardEl = this.$refs[`card-${index}`][0];
      let cardRect = cardEl.getBoundingClientRect();

      let paddingLeft = parseFloat(getComputedStyle(cardEl).paddingLeft);
      let paddingRight = parseFloat(getComputedStyle(cardEl).paddingRight);

      this.mousePos.x = e.pageX;
      this.mousePos.y = e.pageY;

      this.draggedCardIdx = index;

      this.ghostCardStyle.width =
        cardEl.clientWidth - paddingLeft - paddingRight;
      this.ghostCardStyle.cursorDistance.x = e.pageX - cardRect.x;
      this.ghostCardStyle.cursorDistance.y = e.pageY - cardRect.y;

      this.setGhostCardStyle(e);
      this.updateUI();

      if (this.settings.transformOriginMode === 'center')
        this.ghostCardStyle.transformOrigin = 'center';
      else
        this.ghostCardStyle.transformOrigin = `${this.ghostCardStyle.cursorDistance.x}px ${this.ghostCardStyle.cursorDistance.y}px`;
      this.ghostCardStyle.percentDistanceMiddle =
        this.ghostCardStyle.cursorDistance.x - cardEl.clientWidth / 2;
      this.ghostCardStyle.percentDistanceMiddle = Math.abs(
        this.ghostCardStyle.percentDistanceMiddle
      );
      this.ghostCardStyle.percentDistanceMiddle /= cardEl.clientWidth / 2;
      this.ghostCardStyle.percentDistanceMiddle =
        Math.round(this.ghostCardStyle.percentDistanceMiddle * 100) / 100;
    },

    onDrag(e) {
      e = e || window.event;
      if (this.draggedCardIdx === -1)
        return;
      this.mousePos.x = e.pageX;
      this.mousePos.y = e.pageY;
    },

    updateUI() {
      let dragX = this.mousePos.x,
          dragY = this.mousePos.y;

      if (this.draggedCardIdx === -1 || this.ghostCardStyle.leaving) return;

      if (!dragX && !dragY) {
        this.lastMousePos.x = 0;
        this.lastMousePos.y = 0;
        return requestAnimationFrame(this.updateUI);
      }
      this.findTransformValues();
      this.setGhostCardStyle(true);

      let isOverlapping;

      for (let i = 0, paneEl = null; (paneEl = this.$refs[`pane-${i}`]); i++) {
        paneEl = paneEl[0] ? paneEl[0] : paneEl;

        isOverlapping = this.checkOverlap(
          { x: dragX, y: dragY },
          paneEl.getBoundingClientRect()
        );

        if (isOverlapping && this.paneOverlappedIdx === i)
          return requestAnimationFrame(this.updateUI);
        else if (isOverlapping) {
          this.paneOverlappedIdx = i;
          break;
        }
      }

      if (!isOverlapping) {
        return requestAnimationFrame(this.updateUI);
      }
      this.putCardInPane();
      return requestAnimationFrame(this.updateUI);
    },

    onDragStop() {
      if (this.draggedCardIdx === -1)
        return;
      let cardEl = this.$refs[`card-${this.draggedCardIdx}`] && this.$refs[`card-${this.draggedCardIdx}`][0]
      let cardRect = cardEl.getBoundingClientRect();

      if (!this.settings.animateEnd) {
        return this.resetValues()
      }
      setTimeout(() => {
        this.resetValues();
      }, 100);
      this.ghostCardStyle.leaving = true;
      let xOffset = cardRect.x - this.ghostCardStyle.pos.x
      let yOffset = cardRect.y - this.ghostCardStyle.pos.y
      this.ghostCardStyle.transform = `scale(1) translate(${xOffset}px, ${yOffset}px)`
    },

    resetValues() {
      this.draggedCardIdx = -1;
      this.paneOverlappedIdx = -1;
      this.lastMousePos.x = 0;
      this.lastMousePos.y = 0;
      this.ghostCardStyle.x = -1000;
      this.ghostCardStyle.y = -1000;
      this.ghostCardStyle.width = 0;
      this.ghostCardStyle.cursorDistance.x = 0;
      this.ghostCardStyle.cursorDistance.y = 0;
      this.ghostCardStyle.transform = '';
      this.ghostCardStyle.leaving = false;
      this.ghostCardStyle.percentDistanceMiddle = 0;
    },

    checkOverlap(drag, rect) {
      if (drag.x < rect.x || drag.x > rect.x + rect.width) return false;
      if (drag.y < rect.y || drag.y > rect.y + rect.height) return false;
      return true;
    },

    putCardInPane() {
      this.cards[this.draggedCardIdx].paneIndex = this.paneOverlappedIdx;
    },

    setGhostCardStyle(isDragstart) {
      let dragX = this.mousePos.x,
          dragY = this.mousePos.y;
      let transform = [];

      if (isDragstart)
        transform.push(`scale(${this.settings.scale})`);

      transform.push(`rotate(${this.ghostCardStyle.rotation}deg)`);
      this.ghostCardStyle.transform = transform.join(' ');
      this.ghostCardStyle.pos.x = dragX - this.ghostCardStyle.cursorDistance.x;
      this.ghostCardStyle.pos.y = dragY - this.ghostCardStyle.cursorDistance.y;
    },

    findTransformValues() {

      if (!this.settings.smooth) {
        this.ghostCardStyle.rotation = '4';
        this.lastMousePos.x = this.mousePos.x;
        this.lastMousePos.y = this.mousePos.y;
        return;
      }


      let velocity = this.mousePos.x - this.lastMousePos.x;
      let rotation = this.ghostCardStyle.rotation || 0;

      let rotationMin = this.settings.rotationOffset.min;
      let rotationMax = this.settings.rotationOffset.max;
      let rotationOffset =
          (rotationMax - rotationMin) *
          (1 - this.ghostCardStyle.percentDistanceMiddle);
      let rotationMitigation = this.settings.rotationMitigation

      rotation =
        rotation * (1 - rotationMitigation) +
        this.sigmoid(velocity) * (rotationMin + rotationOffset);
      if (Math.abs(rotation) < 0.01) rotation = 0;

      this.ghostCardStyle.velocity = velocity;
      this.ghostCardStyle.rotation = rotation
      this.lastMousePos.x = this.mousePos.x;
      this.lastMousePos.y = this.mousePos.y;
    },

    sigmoid(x) {
      return x / (1 + Math.abs(x));
    },

    expandSettings() {
      if (this.settingsExpanded) return;
      this.settingsExpanded = true;
    },

    wrapSettings() {
      this.settingsExpanded = false;
    }
  }
});

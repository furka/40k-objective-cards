import "core-js/stable"
import "regenerator-runtime/runtime"

import "index.sass"
import { html, render } from "lit-html"
import config from "config.yaml"
import Roll from "roll"
const roll = new Roll()

const template = app =>
  html`
    <header class="score">
      <span>Score:</span>
      <span>${app.__score}</span>
    </header>
    <section class="hand">
      ${app.hand.map(
        card => html`
          <article class="card" id="card-${card.index}">
            <header>
              <span class="card-index">${card.index}</span>
              <span class="card-name">${card.name}</span>
              <span class="card-category">${card.category}</span>
            </header>
            <section>
              <span class="card-fluff">${card.fluff}</span>
              <hr />
              <span class="card-description">${card.text}</span>
            </section>
            <footer>
              <span>Score:</span>
              ${card.points.map(
                value => html`
                  <button @click=${() => card.score(value)}>${value}</button>
                `,
              )}
            </footer>
          </article>
        `,
      )}
    </section>
    <button @click=${() => app.draw()}>draw</button>
  `

class App {
  constructor() {
    this.deck = []
    this.hand = []
    this.__score = 0

    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= 6; j++) {
        this.deck.push(new Objective(`${i}${j}`, this))
      }
    }

    this.render()
  }

  /** Draw a random card from your deck */
  draw() {
    const roll = Math.floor(Math.random() * this.deck.length)
    const card = this.deck.splice(roll, 1)[0]
    this.hand.push(card)
    this.render()
  }

  discard(card) {
    this.hand = this.hand.filter(other => other !== card)
    this.render()
  }

  score(points) {
    this.__score += points
    this.render()
  }

  /** Updates the view */
  render() {
    render(template(this), document.body)
  }
}

class Objective {
  constructor(index, app) {
    this.app = app

    Object.assign(
      this,
      config.cards.find(card => card.index == index),
    )
  }

  score(val) {
    const score = typeof val === "string" ? roll.roll(val).result : val
    this.app.score(score)
    this.app.discard(this)
  }
}

window.app = new App()

import "core-js/stable"
import "regenerator-runtime/runtime"

import "index.sass"
import { html, render } from "lit-html"
import config from "config.yaml"
import Roll from "roll"
const roll = new Roll()

const cardTemplate = card => html`
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
      ${card.score
        ? html`
            <div class="overlay"><span>completed: ${card.score}</span></div>
          `
        : html``}
    </section>
    <footer>
      ${card.isInDeck
        ? html`
            <button @click=${() => card.draw()}>Draw 🡆</button>
          `
        : html``}
      ${card.isInHand
        ? html`
            <button @click=${() => card.return()}>🡄 Return</button>
            <button @click=${() => card.complete()}>Complete 🡆</button>
          `
        : html``}
      ${card.isInDiscard
        ? html`
            <button @click=${() => card.modify()}>Modify score</button>
          `
        : html``}
    </footer>
  </article>
`

const template = app =>
  html`
    <section class="app">
      <header class="score">
        <span>Score:</span>
        <span>${app.score}</span>
      </header>

      <section class="deck ${app.active === "deck" ? "active" : ""}">
        <header @click=${() => app.view("deck")}>
          Deck (${app.drawPile.length})
        </header>
        <section class="body">
          <div class="cards">
            ${app.drawPile.map(card => cardTemplate(card))}
          </div>
        </section>
      </section>
      <section class="hand  ${app.active === "hand" ? "active" : ""}">
        <header @click=${() => app.view("hand")}>
          Hand (${app.hand.length})
        </header>
        <section class="body">
          <button class="draw" @click=${() => app.draw()}>
            + Draw new objective +
          </button>
          <div class="cards">
            ${app.hand.map(card => cardTemplate(card))}
          </div>
        </section>
      </section>
      <section class="discard  ${app.active === "discard" ? "active" : ""}">
        <header @click=${() => app.view("discard")}>
          Discard (${app.discardPile.length})
        </header>
        <section class="body">
          <div class="cards">
            ${app.discardPile.map(card => cardTemplate(card))}
          </div>
        </section>
      </section>
    </section>
    <footer>
      <a class="source" href="https://github.com/furka/40k-objective-cards"
        >view source on GitHub</a
      >
    </footer>
  `

class App {
  constructor() {
    this.drawPile = []
    this.hand = []
    this.discardPile = []
    this.active = "hand"

    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= 6; j++) {
        this.drawPile.push(new Objective(`${i}${j}`, this))
      }
    }

    this.restore()
    this.render()
  }

  /** Removes a card from a pile */
  __remove(card, from) {
    if (from.includes(card)) {
      from.splice(from.indexOf(card), 1)
    }
  }

  /** Moves a card to a specific pile (deck/hand/discard) */
  __move(card, to) {
    this.__remove(card, this.drawPile)
    this.__remove(card, this.hand)
    this.__remove(card, this.discardPile)
    to.unshift(card)
    this.render()
  }

  view(pile) {
    this.active = pile
    this.render()
    window.scrollTo(0, 0)
  }

  /** Draw a specific or random card from your deck */
  draw(card) {
    if (!card) {
      const roll = Math.floor(Math.random() * this.drawPile.length)
      card = this.drawPile[roll]
    }

    if (card) {
      this.__move(card, this.hand)
    }
  }

  /** Discard a card */
  discard(card) {
    this.__move(card, this.discardPile)
  }

  /** Return a card to the draw pile */
  return(card) {
    this.__move(card, this.drawPile)
  }

  get score() {
    return [...this.drawPile, ...this.hand, ...this.discardPile].reduce(
      (score, card) => (score += card.score),
      0,
    )
  }

  /** Updates the view */
  render() {
    this.save()
    render(template(this), document.body)
  }

  /** save session */
  save() {
    const data = {
      active: this.active,
      cards: [...this.drawPile, ...this.hand, ...this.discardPile].map(
        card => ({
          index: card.index,
          score: card.score,
          drawn: card.isInHand,
          discarded: card.isInDiscard,
        }),
      ),
    }

    sessionStorage.setItem("40k-session", JSON.stringify(data))
  }

  /** restore session */
  restore() {
    const data = JSON.parse(sessionStorage.getItem("40k-session"))

    if (data) {
      this.active = data.active

      data.cards.reverse().forEach(data => {
        const card = this.drawPile.find(card => card.index === data.index)

        if (card) {
          card.score = data.score

          if (data.drawn) {
            this.__remove(card, this.drawPile)
            this.hand.unshift(card)
          }

          if (data.discarded) {
            this.__remove(card, this.drawPile)
            this.discardPile.unshift(card)
          }
        }
      })
    }
  }
}

class Objective {
  constructor(index, app) {
    this.app = app
    this.score = 0

    Object.assign(
      this,
      config.cards.find(card => card.index == index),
    )
  }

  get isInHand() {
    return this.app.hand.includes(this)
  }

  get isInDeck() {
    return this.app.drawPile.includes(this)
  }

  get isInDiscard() {
    return this.app.discardPile.includes(this)
  }

  get canBeFaction() {
    return this.index < 20
  }

  draw() {
    this.app.draw(this)
  }

  return() {
    this.app.return(this)
  }

  complete() {
    if (this.modify()) {
      this.app.discard(this)
    }
  }

  modify() {
    const val = prompt(`
      How many points were scored?

      Enter a number or dice roll. Example: d3+3
    `)

    if (val !== null) {
      try {
        this.score = isNaN(Number(val)) ? roll.roll(val).result : Number(val)
        this.app.render()
        return true
      } catch (e) {
        alert(`I'm sorry, I don't understand that value.`)
      }
    }
  }
}

window.app = new App()

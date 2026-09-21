```js
class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <style>

.sidenav {
  height: 100%;
  width: 230px;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  background-color: #E7E9EB;
  overflow-x: hidden;
  padding-top: 20px;
  border-bottom: none;
  border-right: 1px black solid;
}

.sidenav .imagehere {
  width: 170px;
  height: 120px;
  margin: 0 auto 15px auto;
  background-image: url('/img/wiki/icon/wikilogo.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.sidenav a {
  padding: 7px 0px 7px 20px;
  margin: 0px 40px 5px 30px;
  text-decoration: none;
  display: block;
  border: 1px black solid;
  background-color: white;
}

.sidenav p {
  padding: 0px 20px;
  text-decoration: none;
}

.sidenav h2 {
  margin-top: 0px;
  padding: 0px 40px;
  text-decoration: none;
  text-align: justify;
  border-bottom: 0px;
}

@media screen and (max-width: 1350px) {

  .sidenav {
    height: 40px;
    width: 100%;
    position: static;
    overflow-x: scroll;
    scrollbar-width: none;
    background-color: #E7E9EB;
    white-space: nowrap;
    padding-top: 10px;
    align-content: center;
    border-bottom: 1px black solid;
    border-right: none;
  }

  .sidenav a {
    padding: 3px 10px;
    margin: 0px;
    display: inline;
    border: 0px;
    background-color: #E7E9EB;
  }

  .sidenav .imagehere,
  .sidenav br,
  .sidenav p,
  .sidenav h2,
  .sidenav hr {
    display: none;
  }

}
      </style>

      <div class="sidenav">
        <div class="imagehere"></div>
        <h2>WIKI IZMIR</h2>
        <a href="/index.html">Izmir</a>
        <a href="/WIKI/autre/clan">Clans</a>
        <a href="/WIKI/autre/chrono">Chronologie</a>
        <a href="/WIKI/fiche/index">Personnages</a>
      </div>
    `;
  }
}

customElements.define('header-component', Header);
```

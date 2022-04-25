import { useState } from 'react'
import './App.css'
import Title from './components/Title/Title'
import UserRadio from './components/UserRadio/UserRadio'
import Products from './components/Products/Products'

function App() {
  return (
    <div className="App">
      <Title />
      <UserRadio />
      <Products />
    </div>
  )
}

export default App

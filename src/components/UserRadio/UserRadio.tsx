import { useState } from 'react'
import User from '../../models/user'
import './UserRadio.css'

interface UserToggleProps {
  onToggleChange: (user: User) => void
}

function UserToggle(props: UserToggleProps) {
  const [checkedUser, setCheckedUser] = useState<User>(User.Normal)
  
  return (
    <div id='user-container'>
      <fieldset>
        <legend>User</legend>
        <div id='radio-container'>
          <p>
            <label className='radio-label'>
              <input 
                type='radio' 
                name='user' 
                value={User.Normal} 
                checked={checkedUser == User.Normal} 
                onChange={() => {
                  setCheckedUser(User.Normal) 
                  props.onToggleChange(User.Normal)
                }}
              />
              <span className='checkmark'></span>
            {User[User.Normal]}</label>
          </p>
          <p>
            <label className='radio-label'>
              <input 
                type='radio' 
                name='user' 
                value={User.Company} 
                checked={checkedUser == User.Company} 
                onChange={() => {
                  setCheckedUser(User.Company)
                  props.onToggleChange(User.Company)
                }}
              />
              <span className='checkmark'></span>
            {User[User.Company]}</label>
          </p>
        </div>
      </fieldset>
    </div>
  )
}

export default UserToggle

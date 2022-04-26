import { useState } from 'react'
import User from '../../models/user'
import './UserRadio.css'

interface UserToggleProps {
  onToggleChange: (user: User) => void
}

function UserToggle(props: UserToggleProps) {
  const { onToggleChange } = props
  const [checkedUser, setCheckedUser] = useState<User>(User.Normal)
  
  return (
    <div id='user-container'>
      <div id='radio-container'>
        <h6>
          <label className='radio-label'>
            <input 
              type='radio' 
              name='user' 
              value={User.Normal} 
              checked={checkedUser == User.Normal} 
              onChange={() => {
                setCheckedUser(User.Normal) 
                onToggleChange(User.Normal)
              }}
            />
            <span className='checkmark'></span>
          {User[User.Normal]} user</label>
        </h6>
        <h6>
          <label className='radio-label'>
            <input 
              type='radio' 
              name='user' 
              value={User.Company} 
              checked={checkedUser == User.Company} 
              onChange={() => {
                setCheckedUser(User.Company)
                onToggleChange(User.Company)
              }}
            />
            <span className='checkmark'></span>
          {User[User.Company]} user</label>
        </h6>
      </div>
    </div>
  )
}

export default UserToggle

import { useState, useEffect } from 'react'
import { Plus, UserCircle, Mail, Phone } from 'lucide-react'
import api from '../api/axios'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      user: 'bg-green-100 text-green-700'
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Utilisateurs</h1>
          <p className='text-gray-600 mt-2'>{users.length} utilisateur(s) au total</p>
        </div>
        <button className='flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
          <Plus className='w-5 h-5 mr-2' />
          Nouvel utilisateur
        </button>
      </div>

      {users.length === 0 ? (
        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center'>
          <UserCircle className='w-16 h-16 text-gray-300 mx-auto mb-4' />
          <p className='text-gray-500 text-lg'>Aucun utilisateur</p>
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow-sm border border-gray-100'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 border-b'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Utilisateur</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Email</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Téléphone</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Rôle</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Dernière connexion</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Statut</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {users.map((user) => (
                  <tr key={user.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center'>
                          <span className='text-primary-600 font-medium'>
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div className='ml-4'>
                          <div className='font-medium text-gray-900'>
                            {user.first_name} {user.last_name}
                          </div>
                          <div className='text-sm text-gray-500'>{user.tenant_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center text-sm text-gray-600'>
                        <Mail className='w-4 h-4 mr-2 text-gray-400' />
                        {user.email}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                      {user.phone ? (
                        <div className='flex items-center'>
                          <Phone className='w-4 h-4 mr-2 text-gray-400' />
                          {user.phone}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={'px-2 py-1 text-xs font-medium rounded-full ' + getRoleColor(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('fr-FR')
                        : 'Jamais'
                      }
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={'px-2 py-1 text-xs font-medium rounded-full ' + getStatusColor(user.is_active)}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
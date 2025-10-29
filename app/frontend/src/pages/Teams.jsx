import { useState, useEffect } from 'react'
import { Plus, Users as UsersIcon } from 'lucide-react'
import api from '../api/axios'

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams')
      setTeams(response.data.teams || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
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
          <h1 className='text-3xl font-bold text-gray-900'>Équipes</h1>
          <p className='text-gray-600 mt-2'>{teams.length} équipe(s) au total</p>
        </div>
        <button className='flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
          <Plus className='w-5 h-5 mr-2' />
          Nouvelle équipe
        </button>
      </div>

      {teams.length === 0 ? (
        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center'>
          <UsersIcon className='w-16 h-16 text-gray-300 mx-auto mb-4' />
          <p className='text-gray-500 text-lg'>Aucune équipe créée</p>
          <p className='text-gray-400 text-sm mt-2'>Commencez par créer votre première équipe</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {teams.map((team) => (
            <div key={team.id} className='bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow'>
              <div className='flex items-start justify-between mb-4'>
                <div className='p-3 bg-primary-100 rounded-lg'>
                  <UsersIcon className='w-6 h-6 text-primary-600' />
                </div>
                <span className='text-sm text-gray-500'>
                  {team.member_count || 0} membre(s)
                </span>
              </div>
              
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                {team.name}
              </h3>
              
              {team.description && (
                <p className='text-sm text-gray-600 mb-4 line-clamp-2'>
                  {team.description}
                </p>
              )}
              
              {team.manager_name && (
                <div className='flex items-center text-sm text-gray-500'>
                  <span className='font-medium'>Manager:</span>
                  <span className='ml-2'>{team.manager_name}</span>
                </div>
              )}
              
              <div className='mt-4 pt-4 border-t flex justify-between items-center'>
                <span className='text-xs text-gray-400'>
                  Créée le {new Date(team.created_at).toLocaleDateString('fr-FR')}
                </span>
                <button className='text-sm text-primary-600 hover:text-primary-700 font-medium'>
                  Gérer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

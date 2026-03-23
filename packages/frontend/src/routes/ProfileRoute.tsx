import { useParams } from 'react-router'
import ProfileScreen from '../components/ProfileScreen'
import {
  useQueryAccount,
  useQueryAccountStatistics,
  useQueryPublicAccount,
  useQueryPublicAccountStatistics
} from '../query/accountClient'

function ProfileRoute() {
  const { profileId } = useParams<{ profileId: string }>()
  const isPublicProfileRoute = Boolean(profileId)

  const accountQuery = useQueryAccount({ enabled: true })
  const accountStatisticsQuery = useQueryAccountStatistics({
    enabled: !isPublicProfileRoute && !accountQuery.isLoading && Boolean(accountQuery.data?.user)
  })
  const publicAccountQuery = useQueryPublicAccount(profileId ?? null, {
    enabled: isPublicProfileRoute
  })
  const publicAccountStatisticsQuery = useQueryPublicAccountStatistics(profileId ?? null, {
    enabled: isPublicProfileRoute && !publicAccountQuery.isLoading && Boolean(publicAccountQuery.data?.user)
  })

  const account = isPublicProfileRoute
    ? publicAccountQuery.data?.user ?? null
    : accountQuery.data?.user ?? null
  const statistics = isPublicProfileRoute
    ? publicAccountStatisticsQuery.data?.statistics ?? null
    : accountStatisticsQuery.data?.statistics ?? null
  const isLoading = isPublicProfileRoute ? publicAccountQuery.isLoading : accountQuery.isLoading
  const isStatisticsLoading = Boolean(account) && (
    isPublicProfileRoute
      ? publicAccountStatisticsQuery.isLoading || publicAccountStatisticsQuery.isRefetching
      : accountStatisticsQuery.isLoading || accountStatisticsQuery.isRefetching
  )
  const error = isPublicProfileRoute ? publicAccountQuery.error : accountQuery.error
  const statisticsError = isPublicProfileRoute ? publicAccountStatisticsQuery.error : accountStatisticsQuery.error

  return (
    <ProfileScreen
      account={account}
      statistics={statistics}
      isLoading={isLoading}
      isStatisticsLoading={isStatisticsLoading}
      errorMessage={error instanceof Error ? error.message : null}
      statisticsErrorMessage={statisticsError instanceof Error ? statisticsError.message : null}
      isPublicView={isPublicProfileRoute}
    />
  )
}

export default ProfileRoute

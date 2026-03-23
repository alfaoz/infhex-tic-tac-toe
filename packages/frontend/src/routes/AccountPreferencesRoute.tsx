import AccountPreferencesScreen from '../components/AccountPreferencesScreen'
import { useQueryAccount, useQueryAccountPreferences } from '../query/accountClient'

function AccountPreferencesRoute() {
  const accountQuery = useQueryAccount({ enabled: true })
  const accountPreferencesQuery = useQueryAccountPreferences({
    enabled: !accountQuery.isLoading && Boolean(accountQuery.data?.user)
  })

  return (
    <AccountPreferencesScreen
      account={accountQuery.data?.user ?? null}
      preferences={accountPreferencesQuery.data?.preferences ?? null}
      isLoading={accountQuery.isLoading}
      isPreferencesLoading={Boolean(accountQuery.data?.user) && (accountPreferencesQuery.isLoading || accountPreferencesQuery.isRefetching)}
      errorMessage={accountQuery.error instanceof Error ? accountQuery.error.message : null}
      preferencesErrorMessage={accountPreferencesQuery.error instanceof Error ? accountPreferencesQuery.error.message : null}
    />
  )
}

export default AccountPreferencesRoute

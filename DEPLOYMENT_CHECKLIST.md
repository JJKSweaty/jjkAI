# Token Analytics Dashboard - Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in frontend `.env.local`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in frontend `.env.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in server `.env`
- [ ] `ANTHROPIC_API_KEY` set in server `.env`

### Dependencies
- [ ] Frontend dependencies installed: `npm install recharts @radix-ui/react-tabs`
- [ ] Server dependencies installed: `cd apps/server && npm install @supabase/supabase-js`
- [ ] All TypeScript compilation errors resolved: `npm run build`
- [ ] Server builds successfully: `cd apps/server && npm run build`

### Database
- [ ] Migration SQL executed in Supabase SQL Editor
- [ ] Table `usage_events` exists
- [ ] Table `price_map` exists with pricing data
- [ ] Materialized view `daily_usage_summary` exists
- [ ] All 7 indexes created successfully
- [ ] Verify with: `SELECT * FROM usage_events LIMIT 1;`

## Testing

### Backend API
- [ ] Server starts without errors: `cd apps/server && npm run dev`
- [ ] Test endpoint: `GET http://localhost:8080/api/tokens/summary?from=2025-10-14&to=2025-10-21`
- [ ] Returns JSON response (may be empty initially)
- [ ] No CORS errors in browser console
- [ ] Usage logging works: make a chat request, check `usage_events` table
- [ ] Cost calculation is accurate (check against Anthropic pricing)

### Frontend
- [ ] Frontend starts: `npm run dev`
- [ ] Navigate to `http://localhost:3000/analytics/tokens`
- [ ] Page loads without errors (may show empty states)
- [ ] No TypeScript errors in terminal
- [ ] No console errors in browser

### UI Components
- [ ] KPI cards render (may show zeros)
- [ ] Chart renders (may be empty)
- [ ] Tabs switch (Overview/Leaderboard/Users/Models)
- [ ] Filters work (date range, model)
- [ ] "Back to JJK-AI" button navigates to `/`
- [ ] Token badge in chat interface is clickable
- [ ] Token badge navigates to analytics page

### Data Flow
- [ ] Make 5-10 chat requests in different modes (Quick/Standard/DeepDive)
- [ ] Verify events appear in `usage_events` table:
  ```sql
  SELECT * FROM usage_events ORDER BY timestamp DESC LIMIT 10;
  ```
- [ ] Refresh analytics page
- [ ] KPIs now show non-zero values
- [ ] Chart shows data points
- [ ] Leaderboard shows users
- [ ] Users table populated
- [ ] Models table populated

### Export
- [ ] Click "Export CSV" button
- [ ] File downloads automatically
- [ ] File contains data matching filters
- [ ] CSV format is valid (open in Excel/Sheets)

## Edge Cases

### Empty States
- [ ] New install with no data shows helpful empty states
- [ ] Each table has appropriate empty state message
- [ ] Icons display correctly (Trophy, Users, Cpu)

### Error Handling
- [ ] Invalid date range shows error or defaults gracefully
- [ ] Network failure shows error message
- [ ] Supabase timeout handled gracefully
- [ ] Large datasets paginate properly

### Performance
- [ ] Page loads in < 2 seconds
- [ ] Chart renders smoothly
- [ ] No lag when switching tabs
- [ ] Filter changes apply quickly
- [ ] CSV export completes in reasonable time

### Mobile Responsive
- [ ] Layout adapts to mobile screen
- [ ] Cards stack vertically
- [ ] Tables scroll horizontally
- [ ] Filters remain accessible
- [ ] Chart remains readable

## Production Deployment

### Build
- [ ] Frontend builds: `npm run build`
- [ ] Server builds: `cd apps/server && npm run build`
- [ ] No warnings or errors

### Environment Variables (Production)
- [ ] Production Supabase URL configured
- [ ] Production API keys secured (not in git)
- [ ] CORS origins updated for production domain
- [ ] Rate limiting configured (if applicable)

### Database
- [ ] Production database has tables
- [ ] Indexes are created
- [ ] Materialized view scheduled to refresh (cron job)
- [ ] Row-level security configured (if needed)

### Monitoring
- [ ] Server logs accessible
- [ ] Usage logging confirmed in production
- [ ] Cost tracking accurate
- [ ] Supabase connection stable

## Post-Deployment

### Smoke Tests
- [ ] Visit production URL `/analytics/tokens`
- [ ] Make test chat requests
- [ ] Verify data appears in dashboard
- [ ] Export CSV from production
- [ ] Check logs for errors

### User Access
- [ ] Share analytics URL with team
- [ ] Document how to access dashboard
- [ ] (Optional) Set up RBAC if needed
- [ ] (Optional) Create read-only analyst accounts

### Documentation
- [ ] README updated with analytics info
- [ ] Environment setup documented
- [ ] Known issues documented
- [ ] Contact info for support

## Maintenance

### Weekly
- [ ] Refresh materialized view: `REFRESH MATERIALIZED VIEW daily_usage_summary;`
- [ ] Check for anomalies in cost tracking
- [ ] Verify usage patterns are expected

### Monthly
- [ ] Review top users and models
- [ ] Update pricing if Anthropic changes rates
- [ ] Archive old usage_events if needed (>90 days)
- [ ] Check disk usage on Supabase

### Quarterly
- [ ] Review RBAC policies
- [ ] Update analytics feature based on feedback
- [ ] Optimize slow queries if needed
- [ ] Consider additional metrics/views

## Rollback Plan

If issues occur:
1. **Frontend issues**: Revert to previous deployment
2. **Backend issues**: Stop server, fix, rebuild
3. **Database issues**: 
   ```sql
   DROP TABLE IF EXISTS usage_events CASCADE;
   DROP TABLE IF EXISTS price_map CASCADE;
   DROP MATERIALIZED VIEW IF EXISTS daily_usage_summary;
   ```
4. **Data corruption**: Restore from Supabase backup

## Support Contacts

- **Frontend issues**: Check Next.js logs
- **Server issues**: Check Fastify logs
- **Database issues**: Supabase dashboard
- **Anthropic API**: Anthropic dashboard

## Success Criteria

- ✅ Dashboard loads without errors
- ✅ Real usage data populates within 5 minutes
- ✅ All KPIs display accurate values
- ✅ Chart shows time-series data
- ✅ CSV export works
- ✅ Token badge links to analytics
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Dark mode works
- ✅ Performance < 2s page load

## Notes

- Initial deployment may show empty states until usage data accumulates
- Materialized view needs manual refresh or cron job
- Consider RBAC if deploying to production with multiple users
- Monitor Supabase storage as usage_events can grow large
- Consider archiving strategy for data > 90 days

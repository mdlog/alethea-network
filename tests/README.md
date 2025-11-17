# Alethea Oracle - Test Files

Folder ini berisi semua file testing, scripts, dan logs untuk Alethea Oracle Network.

---

## 📁 Contents

### Test Scripts (*.sh)
Script bash untuk testing berbagai komponen:
- **test-*.sh** - Test scripts untuk berbagai fitur
- **deploy-*.sh** - Deployment test scripts
- **register-*.sh** - Voter registration test scripts
- **execute-*.sh** - Operation execution test scripts
- **verify-*.sh** - Verification test scripts

### Python Scripts (*.py)
Script Python untuk testing dan utilities:
- **check_*.py** - Checking scripts
- **test_*.py** - Python test scripts
- **find_*.py** - Finding/searching scripts
- **fix-*.py** - Fix scripts

### Log Files (*.log)
Log files dari berbagai test runs:
- **deploy-*.log** - Deployment logs
- **test-*.log** - Test execution logs
- **voter-*.log** - Voter-related logs
- **linera-*.log** - Linera service logs

### Configuration Files (*.json)
Test configuration files:
- **protocol-params.json** - Protocol parameters
- **oracle-registry-v2-params.json** - Registry parameters
- **register-voter-*.json** - Voter registration configs

### HTML Files (*.html)
Test UI dan demo pages:
- **voter-registration-ui.html** - Voter registration UI
- **test-linera-client.html** - Linera client test page

### Text Files (*.txt)
Miscellaneous text files:
- **FINAL_CHECKLIST.txt** - Final checklist
- **READY_TO_TEST.txt** - Ready to test marker
- **voter*_key.txt** - Voter keys

---

## 🧪 Common Test Workflows

### 1. Test Voter Registration
```bash
cd tests
./test-voter-registration.sh
```

### 2. Test Complete Workflow
```bash
cd tests
./test-complete-workflow.sh
```

### 3. Test Backend
```bash
cd tests
./test-backend-start.sh
```

### 4. Test Dashboard
```bash
cd tests
./test-dashboard-registration.sh
```

### 5. Deploy and Test
```bash
cd tests
./deploy-and-test.sh
```

---

## 📊 Test Categories

### Deployment Tests
- deploy-and-test.sh
- deploy-fresh.sh
- deploy-safe.sh
- deploy-with-mutation.sh
- redeploy-contract-with-mutations.sh

### Registration Tests
- test-voter-registration.sh
- test-register-voter-cli.sh
- register-voter.sh
- register-alice.sh
- test-account-based-registration.sh

### Integration Tests
- test-complete-workflow.sh
- test-e2e-complete.sh
- test-integration-complete.sh
- test-resolution-workflow.sh

### Backend Tests
- test-backend-start.sh
- test-backend-register-alice.sh
- restart-backend.sh

### Dashboard Tests
- test-dashboard-registration.sh
- test-dashboard-config.sh
- restart-dashboard.sh

### Verification Tests
- verify-deployment.sh
- verify-message-registration.sh
- verify-deployment-config.sh

---

## 🔍 Finding Specific Tests

### By Component
- **Voter:** test-voter-*, register-voter-*
- **Backend:** test-backend-*, restart-backend*
- **Dashboard:** test-dashboard-*, restart-dashboard*
- **Oracle:** test-oracle-*, test-alethea-*
- **Registry:** test-register-*, test-registry-*

### By Action
- **Deploy:** deploy-*, redeploy-*
- **Test:** test-*
- **Register:** register-*
- **Execute:** execute-*
- **Verify:** verify-*
- **Restart:** restart-*

### By Environment
- **Local:** *-local.sh, setup-and-test-local.sh
- **Testnet:** test-complete-workflow.sh (default testnet)
- **Simple:** *-simple.sh, test-simple.sh

---

## 📝 Log Files

### Recent Logs
Check the most recent logs for latest test results:
```bash
ls -lt tests/*.log | head -10
```

### Important Logs
- **deploy-fresh.log** - Latest fresh deployment
- **linera-service.log** - Linera service output
- **dashboard.log** - Dashboard output (if exists)

### View Logs
```bash
# View specific log
cat tests/deploy-fresh.log

# Tail log in real-time
tail -f tests/linera-service.log

# Search in logs
grep "ERROR" tests/*.log
```

---

## 🚀 Quick Test Commands

### Test Everything
```bash
cd tests
./test-complete-workflow.sh
```

### Test Voter Registration Only
```bash
cd tests
./test-voter-registration.sh
```

### Test Backend Only
```bash
cd tests
./test-backend-start.sh
```

### Deploy Fresh and Test
```bash
cd tests
./deploy-fresh.sh
./test-complete-workflow.sh
```

---

## 🛠️ Utility Scripts

### Restart Services
```bash
cd tests
./restart-all-services.sh
```

### Clean and Reset
```bash
cd tests
./clean-and-reset.sh
```

### Update Configuration
```bash
cd tests
./update-app-id.sh
./update-registry-id.sh
```

---

## 📋 Test Checklist

Before running tests, ensure:
- [ ] Linera service is running (`linera service --port 8080`)
- [ ] Wallet is initialized
- [ ] Contract is deployed
- [ ] Environment variables are set (`.env.fresh`)

After tests:
- [ ] Check logs for errors
- [ ] Verify voter count
- [ ] Test GraphQL queries
- [ ] Check backend health

---

## 🐛 Troubleshooting

### Tests Failing?
1. Check if services are running
2. Verify environment variables
3. Check logs for errors
4. Try clean deployment

### Can't Find a Test?
```bash
# Search for test by name
find tests -name "*voter*"

# Search in test content
grep -r "register voter" tests/*.sh
```

### Logs Too Large?
```bash
# Archive old logs
tar -czf tests/logs-backup-$(date +%Y%m%d).tar.gz tests/*.log

# Clean old logs
rm tests/*.log
```

---

## 📚 Related Documentation

- **Main README:** ../README.md
- **Documentation:** ../docs/README.md
- **Testing Guide:** ../docs/TESTING_GUIDE_ACCOUNT_BASED.md
- **Integration Test Guide:** ../docs/INTEGRATION_TEST_GUIDE.md

---

## 🎯 Best Practices

1. **Always check logs** after running tests
2. **Use descriptive names** for new test scripts
3. **Clean up** after tests (stop services, clean temp files)
4. **Document** new tests in this README
5. **Version control** important test configurations

---

**Note:** Test scripts are for development and testing purposes. For production deployment, use the guides in the `docs` folder.

**Last Updated:** November 17, 2025

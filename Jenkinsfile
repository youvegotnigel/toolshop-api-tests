// Declarative pipeline mirroring .github/workflows/ci.yml.
// Needs: Docker Pipeline, JUnit, HTML Publisher plugins (Allure Jenkins plugin optional).
// Credentials (Secret text): toolshop-admin-password, toolshop-customer-password.
pipeline {
  agent {
    docker {
      image 'node:24-bookworm-slim'
      args '-u root'
    }
  }

  parameters {
    choice(name: 'TEST_ENV', choices: ['public', 'stub'], description: 'Target environment')
    string(name: 'GREP', defaultValue: '', description: 'Optional tag filter, e.g. @smoke')
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
    disableConcurrentBuilds()
  }

  triggers {
    cron('H 1 * * *')
  }

  environment {
    CI = 'true'
    TEST_ENV = "${params.TEST_ENV}"
    ALLURE = '1'
    ADMIN_PASSWORD = credentials('toolshop-admin-password')
    CUSTOMER_PASSWORD = credentials('toolshop-customer-password')
    HUSKY = '0'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Quality gate') {
      steps {
        sh 'npm run typecheck'
        sh 'npm run lint'
        sh 'npm run format:check'
        sh 'node scripts/agent-parity.mts'
      }
    }
    stage('API tests') {
      steps {
        sh "npx playwright test ${params.GREP ? "--grep '${params.GREP}'" : ''}"
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
      publishHTML(target: [
        reportName: 'Playwright Report',
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true,
      ])
      archiveArtifacts artifacts: 'test-results/**, allure-results/**', allowEmptyArchive: true
      // allure includeProperties: false, results: [[path: 'allure-results']]   // with the Allure plugin
    }
  }
}

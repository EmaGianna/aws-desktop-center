import { invoke, state, icon } from './services/shared.js';
import { renderS3 } from './services/s3.js';
import { renderDynamoDB } from './services/dynamodb.js';
import { renderRDS } from './services/rds.js';
import { renderRedshift } from './services/redshift.js';
import { renderGlue } from './services/glue.js';
import { renderAthena } from './services/athena.js';
import { renderLambda } from './services/lambda.js';
import { renderCloudWatch } from './services/cloudwatch.js';
import { renderEventBridge } from './services/eventbridge.js';
import { renderLakeFormation } from './services/lakeformation.js';
import { renderEc2 } from './services/ec2.js';
import { renderVpc } from './services/vpc.js';
import { renderEcs } from './services/ecs.js';
import { renderEcr } from './services/ecr.js';
import { renderEks } from './services/eks.js';
import { renderBatch } from './services/batch.js';
import { renderCodeBuild } from './services/codebuild.js';
import { renderElasticBeanstalk } from './services/elasticbeanstalk.js';
import { renderEbs } from './services/ebs.js';
import { renderEfs } from './services/efs.js';
import { renderBackup } from './services/backup.js';
import { renderS3Tables } from './services/s3tables.js';
import { renderS3Vectors } from './services/s3vectors.js';
import { renderS3Files } from './services/s3files.js';
import { renderSqs } from './services/sqs.js';
import { renderSns } from './services/sns.js';
import { renderStepFunctions } from './services/stepfunctions.js';
import { renderScheduler } from './services/scheduler.js';
import { renderPipes } from './services/pipes.js';
import { renderMq } from './services/mq.js';
import { renderIam } from './services/iam.js';
import { renderSts } from './services/sts.js';
import { renderSecrets } from './services/secretsmanager.js';
import { renderSsm } from './services/ssm.js';
import { renderKms } from './services/kms.js';
import { renderCognito } from './services/cognito.js';
import { renderAcm } from './services/acm.js';
import { renderWaf } from './services/waf.js';
import { renderInspector2 } from './services/inspector2.js';
import { renderElastiCache } from './services/elasticache.js';
import { renderMemoryDb } from './services/memorydb.js';
import { renderDocDb } from './services/docdb.js';
import { renderNeptune } from './services/neptune.js';
import { renderOpenSearch } from './services/opensearch.js';
import { renderRdsData } from './services/rdsdata.js';
import { renderKinesis } from './services/kinesis.js';
import { renderFirehose } from './services/firehose.js';
import { renderEmr } from './services/emr.js';
import { renderKafka } from './services/kafka.js';
import { renderApiGateway } from './services/apigateway.js';
import { renderApiGatewayV2 } from './services/apigatewayv2.js';
import { renderRoute53 } from './services/route53.js';
import { renderCloudFront } from './services/cloudfront.js';
import { renderCfKvs } from './services/cloudfrontkvs.js';
import { renderElbv2 } from './services/elbv2.js';
import { renderAppSync } from './services/appsync.js';
import { renderCloudMap } from './services/cloudmap.js';
import { renderCloudFormation } from './services/cloudformation.js';
import { renderAutoScaling } from './services/autoscaling.js';
import { renderAppConfig } from './services/appconfig.js';
import { renderResourceGroupsTagging } from './services/resourcegroupstagging.js';
import { renderAwsConfig } from './services/awsconfig.js';
import { renderCloudTrail } from './services/cloudtrail.js';
import { renderOrganizations } from './services/organizations.js';
import { renderAccount } from './services/account.js';
import { renderCodeDeploy } from './services/codedeploy.js';
import { renderCodePipeline } from './services/codepipeline.js';
import { renderCostExplorer } from './services/costexplorer.js';
import { renderPricing } from './services/pricing.js';
import { renderCur } from './services/costandusagereport.js';
import { renderSes } from './services/sesv2.js';
import { renderTransfer } from './services/transfer.js';
import { renderIot } from './services/iot.js';
import { formatError } from './services/shared.js';

// `category` groups services in the sidebar/grid (see doc/en/development-plan-new-services.md Phase 0).
// `unsupportedInEmulator: true` marks services that neither Floci nor MiniStack emulate yet
// (see doc/en/emulated-services-analysis.md) — shown with a warning badge when the active
// profile points at an emulated endpoint.
const SERVICES = [
  { id: 's3', name: 'S3', icon: 's3', description: 'Object Storage', category: 'Storage' },
  { id: 'ebs', name: 'EBS', icon: 's3', description: 'Block Storage Volumes', category: 'Storage' },
  { id: 'efs', name: 'EFS', icon: 's3', description: 'Managed File Storage', category: 'Storage' },
  { id: 'backup', name: 'AWS Backup', icon: 's3', description: 'Centralized Backup', category: 'Storage' },
  { id: 's3tables', name: 'S3 Tables', icon: 's3', description: 'Iceberg Table Storage', category: 'Storage' },
  { id: 's3vectors', name: 'S3 Vectors', icon: 's3', description: 'Vector Search Storage', category: 'Storage' },
  { id: 's3files', name: 'S3 Files', icon: 's3', description: 'Managed File Systems', category: 'Storage' },
  { id: 'transfer', name: 'Transfer Family', icon: 's3', description: 'Managed SFTP/FTP', category: 'Storage' },
  { id: 'dynamodb', name: 'DynamoDB', icon: 'dynamodb', description: 'NoSQL Database', category: 'Database' },
  { id: 'rds', name: 'RDS', icon: 'rds', description: 'Relational Database', category: 'Database' },
  { id: 'redshift', name: 'Redshift', icon: 'redshift', description: 'Data Warehouse', category: 'Database', unsupportedInEmulator: true },
  { id: 'elasticache', name: 'ElastiCache', icon: 'rds', description: 'Redis/Memcached Clusters', category: 'Database' },
  { id: 'memorydb', name: 'MemoryDB', icon: 'rds', description: 'Redis-Compatible Database', category: 'Database' },
  { id: 'docdb', name: 'DocumentDB', icon: 'rds', description: 'MongoDB-Compatible Database', category: 'Database' },
  { id: 'neptune', name: 'Neptune', icon: 'rds', description: 'Graph Database', category: 'Database' },
  { id: 'opensearch', name: 'OpenSearch', icon: 'athena', description: 'Search & Analytics', category: 'Database' },
  { id: 'rdsdata', name: 'RDS Data API', icon: 'rds', description: 'Serverless SQL Access', category: 'Database' },
  { id: 'glue', name: 'Glue', icon: 'glue', description: 'ETL Service', category: 'Analytics' },
  { id: 'athena', name: 'Athena', icon: 'athena', description: 'Query Service', category: 'Analytics' },
  { id: 'kinesis', name: 'Kinesis', icon: 'cloudwatch', description: 'Real-Time Data Streams', category: 'Analytics' },
  { id: 'firehose', name: 'Data Firehose', icon: 'cloudwatch', description: 'Streaming Data Delivery', category: 'Analytics' },
  { id: 'emr', name: 'EMR', icon: 'glue', description: 'Big Data Processing', category: 'Analytics' },
  { id: 'kafka', name: 'MSK (Kafka)', icon: 'cloudwatch', description: 'Managed Kafka', category: 'Analytics' },
  { id: 'lambda', name: 'Lambda', icon: 'lambda', description: 'Serverless Functions', category: 'Compute' },
  { id: 'ec2', name: 'EC2', icon: 'lambda', description: 'Virtual Servers', category: 'Compute' },
  { id: 'ecs', name: 'ECS', icon: 'lambda', description: 'Container Orchestration', category: 'Compute' },
  { id: 'ecr', name: 'ECR', icon: 'lambda', description: 'Container Registry', category: 'Compute' },
  { id: 'eks', name: 'EKS', icon: 'lambda', description: 'Managed Kubernetes', category: 'Compute' },
  { id: 'batch', name: 'AWS Batch', icon: 'lambda', description: 'Batch Job Processing', category: 'Compute' },
  { id: 'codebuild', name: 'CodeBuild', icon: 'lambda', description: 'Build Service', category: 'Compute' },
  { id: 'elasticbeanstalk', name: 'Elastic Beanstalk', icon: 'lambda', description: 'App Hosting Platform', category: 'Compute' },
  { id: 'codedeploy', name: 'CodeDeploy', icon: 'lambda', description: 'Automated Deployments', category: 'Compute' },
  { id: 'codepipeline', name: 'CodePipeline', icon: 'lambda', description: 'CI/CD Pipelines', category: 'Compute' },
  { id: 'vpc', name: 'VPC', icon: 'eventbridge', description: 'Networking', category: 'Networking' },
  { id: 'apigateway', name: 'API Gateway (REST)', icon: 'eventbridge', description: 'REST APIs', category: 'Networking' },
  { id: 'apigatewayv2', name: 'API Gateway v2', icon: 'eventbridge', description: 'HTTP & WebSocket APIs', category: 'Networking' },
  { id: 'route53', name: 'Route 53', icon: 'eventbridge', description: 'DNS Management', category: 'Networking' },
  { id: 'cloudfront', name: 'CloudFront', icon: 'eventbridge', description: 'CDN', category: 'Networking' },
  { id: 'cloudfrontkvs', name: 'CloudFront KeyValueStore', icon: 'eventbridge', description: 'Edge Key-Value Data', category: 'Networking' },
  { id: 'elbv2', name: 'Load Balancers', icon: 'eventbridge', description: 'ALB / NLB', category: 'Networking' },
  { id: 'appsync', name: 'AppSync', icon: 'athena', description: 'GraphQL APIs', category: 'Networking' },
  { id: 'cloudmap', name: 'Cloud Map', icon: 'eventbridge', description: 'Service Discovery', category: 'Networking' },
  { id: 'cloudwatch', name: 'CloudWatch', icon: 'cloudwatch', description: 'Monitoring & Logs', category: 'Monitoring' },
  { id: 'eventbridge', name: 'EventBridge', icon: 'eventbridge', description: 'Event Bus', category: 'Messaging' },
  { id: 'sqs', name: 'SQS', icon: 'eventbridge', description: 'Message Queues', category: 'Messaging' },
  { id: 'sns', name: 'SNS', icon: 'eventbridge', description: 'Pub/Sub Notifications', category: 'Messaging' },
  { id: 'stepfunctions', name: 'Step Functions', icon: 'eventbridge', description: 'Workflow Orchestration', category: 'Messaging' },
  { id: 'scheduler', name: 'EventBridge Scheduler', icon: 'eventbridge', description: 'Scheduled Tasks', category: 'Messaging' },
  { id: 'pipes', name: 'EventBridge Pipes', icon: 'eventbridge', description: 'Point-to-Point Integrations', category: 'Messaging' },
  { id: 'mq', name: 'Amazon MQ', icon: 'eventbridge', description: 'Managed Message Brokers', category: 'Messaging' },
  { id: 'ses', name: 'SES', icon: 'eventbridge', description: 'Email Sending', category: 'Messaging' },
  { id: 'iot', name: 'IoT Core', icon: 'cloudwatch', description: 'Device Management', category: 'Messaging' },
  { id: 'lakeformation', name: 'Lake Formation', icon: 'glue', description: 'Data Governance', category: 'Governance', unsupportedInEmulator: true },
  { id: 'cloudformation', name: 'CloudFormation', icon: 'glue', description: 'Infrastructure as Code', category: 'Governance' },
  { id: 'autoscaling', name: 'Auto Scaling', icon: 'lambda', description: 'EC2 Auto Scaling Groups', category: 'Governance' },
  { id: 'appconfig', name: 'AppConfig', icon: 'lambda', description: 'Application Configuration', category: 'Governance' },
  { id: 'resourcegroupstagging', name: 'Resource Groups Tagging', icon: 'profile', description: 'Tag Management', category: 'Governance' },
  { id: 'awsconfig', name: 'AWS Config', icon: 'cloudwatch', description: 'Resource Compliance', category: 'Governance' },
  { id: 'cloudtrail', name: 'CloudTrail', icon: 'cloudwatch', description: 'Audit Logging', category: 'Governance' },
  { id: 'organizations', name: 'Organizations', icon: 'profile', description: 'Multi-Account Management', category: 'Governance' },
  { id: 'account', name: 'Account', icon: 'profile', description: 'Account Info & Regions', category: 'Governance' },
  { id: 'iam', name: 'IAM', icon: 'profile', description: 'Users, Roles & Policies', category: 'Security' },
  { id: 'sts', name: 'STS', icon: 'profile', description: 'Security Token Service', category: 'Security' },
  { id: 'secretsmanager', name: 'Secrets Manager', icon: 'profile', description: 'Secret Storage', category: 'Security' },
  { id: 'ssm', name: 'SSM Parameter Store', icon: 'profile', description: 'Configuration Parameters', category: 'Security' },
  { id: 'kms', name: 'KMS', icon: 'profile', description: 'Encryption Keys', category: 'Security' },
  { id: 'cognito', name: 'Cognito', icon: 'profile', description: 'User Identity', category: 'Security' },
  { id: 'acm', name: 'ACM', icon: 'profile', description: 'SSL/TLS Certificates', category: 'Security' },
  { id: 'waf', name: 'WAF v2', icon: 'profile', description: 'Web Application Firewall', category: 'Security' },
  { id: 'inspector2', name: 'Inspector', icon: 'profile', description: 'Vulnerability Scanning', category: 'Security' },
  { id: 'costexplorer', name: 'Cost Explorer', icon: 'cloudwatch', description: 'Cost Analysis', category: 'Cost' },
  { id: 'pricing', name: 'Pricing', icon: 'cloudwatch', description: 'AWS Price Lookup', category: 'Cost' },
  { id: 'cur', name: 'Cost & Usage Reports', icon: 'cloudwatch', description: 'Billing Reports', category: 'Cost' },
];

const CATEGORY_ORDER = ['Storage', 'Database', 'Analytics', 'Compute', 'Networking', 'Security', 'Monitoring', 'Messaging', 'Governance', 'Cost'];

const collapsedCategories = new Set();

function groupByCategory(services) {
  const groups = new Map();
  for (const s of services) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category).push(s);
  }
  return CATEGORY_ORDER.filter(c => groups.has(c)).map(c => ({ category: c, items: groups.get(c) }));
}

async function init() {
  const profiles = await invoke('get_profiles');
  renderProfileSelector(profiles);
}

function renderProfileSelector(profiles) {
  document.getElementById('root').innerHTML = `
    <div class="profile-selector">
      <div class="profile-card">
        <h1 class="app-title">AWS Desktop Center</h1>
        <p class="app-subtitle">Select an AWS Profile</p>
        <div class="profile-list">
          ${profiles.map(p => `<button class="profile-btn" data-profile="${p}">${icon('profile', 'icon-sm')} ${p}</button>`).join('')}
          ${profiles.length === 0 ? '<p style="color:var(--text-secondary)">No profiles found in ~/.aws/credentials</p>' : ''}
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.onclick = async () => {
      state.profile = btn.dataset.profile;
      state.profileInfo = await invoke('get_profile_info', { profile: state.profile });
      renderApp();
    };
  });
}

function isUnsupported(service) {
  return !!(service.unsupportedInEmulator && state.profileInfo?.is_emulated);
}

function renderApp() {
  const profileInfo = state.profileInfo || {};
  const emulatedBadge = profileInfo.is_emulated ? `<span class="emulated-badge">EMULATED: ${profileInfo.endpoint_url}</span>` : '';
  const categories = groupByCategory(SERVICES);

  document.getElementById('root').innerHTML = `
    <div class="app-container">
      <nav class="sidebar">
        <div class="sidebar-header"><h2>AWS Desktop Center</h2><span class="profile-badge">${state.profile}</span>${emulatedBadge}</div>
        <input type="text" class="sidebar-search" id="sidebar-search" placeholder="Search services..." />
        <div class="sidebar-categories" id="sidebar-categories">
          ${categories.map(({ category, items }) => `
            <div class="sidebar-category" data-category="${category}">
              <div class="sidebar-category-header" data-category="${category}">
                <span>${category}</span>
                <span class="sidebar-category-chevron">${collapsedCategories.has(category) ? '▸' : '▾'}</span>
              </div>
              <ul class="sidebar-menu ${collapsedCategories.has(category) ? 'hidden' : ''}">
                ${items.map(s => `
                  <li class="sidebar-item ${state.activeService === s.id ? 'active' : ''}" data-id="${s.id}" data-name="${s.name.toLowerCase()}">
                    ${icon(s.icon, 'icon-sm')} <span>${s.name}</span>
                    ${isUnsupported(s) ? '<span class="unsupported-badge" title="Not supported by the active emulator">⚠</span>' : ''}
                  </li>`).join('')}
              </ul>
            </div>`).join('')}
        </div>
        <button class="logout-btn">${icon('power', 'icon-xs')} Switch Profile</button>
      </nav>
      <main class="content-area" id="content"></main>
    </div>`;

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.onclick = () => { state.activeService = item.dataset.id; renderApp(); loadService(item.dataset.id); };
  });
  document.querySelectorAll('.sidebar-category-header').forEach(header => {
    header.onclick = () => {
      const category = header.dataset.category;
      if (collapsedCategories.has(category)) collapsedCategories.delete(category);
      else collapsedCategories.add(category);
      renderApp();
      if (state.activeService) loadService(state.activeService);
    };
  });
  document.getElementById('sidebar-search').oninput = (e) => applySidebarFilter(e.target.value);
  document.querySelector('.logout-btn').onclick = () => { state.profile = null; state.activeService = null; init(); };

  if (state.activeService) loadService(state.activeService);
  else renderServiceGrid();
}

function applySidebarFilter(query) {
  const filter = query.trim().toLowerCase();
  document.querySelectorAll('.sidebar-category').forEach(catEl => {
    const menu = catEl.querySelector('.sidebar-menu');
    let anyVisible = false;
    catEl.querySelectorAll('.sidebar-item').forEach(item => {
      const match = !filter || item.dataset.name.includes(filter);
      item.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    if (filter) {
      // While searching, ignore the collapsed state so matches are visible.
      menu.classList.remove('hidden');
      catEl.style.display = anyVisible ? '' : 'none';
    } else {
      catEl.style.display = '';
      menu.classList.toggle('hidden', collapsedCategories.has(catEl.dataset.category));
    }
  });
}

function renderServiceGrid() {
  const categories = groupByCategory(SERVICES);
  document.getElementById('content').innerHTML = categories.map(({ category, items }) => `
    <h3 class="section-title">${category}</h3>
    <div class="service-grid">
      ${items.map(s => `
        <div class="service-tile" data-id="${s.id}">
          ${icon(s.icon, 'icon-lg')}
          <span class="tile-name">${s.name}</span>
          <span class="tile-desc">${s.description}</span>
          ${isUnsupported(s) ? '<span class="unsupported-badge" title="Not supported by the active emulator">⚠ emulator</span>' : ''}
        </div>`).join('')}
    </div>`).join('');
  document.querySelectorAll('.service-tile').forEach(tile => {
    tile.onclick = () => { state.activeService = tile.dataset.id; renderApp(); loadService(tile.dataset.id); };
  });
}

async function loadService(id) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading...</div>';
  try {
    switch (id) {
      case 's3': await renderS3(); break;
      case 'dynamodb': await renderDynamoDB(); break;
      case 'rds': await renderRDS(); break;
      case 'redshift': await renderRedshift(); break;
      case 'glue': await renderGlue(); break;
      case 'athena': await renderAthena(); break;
      case 'lambda': await renderLambda(); break;
      case 'ec2': await renderEc2(); break;
      case 'ecs': await renderEcs(); break;
      case 'ecr': await renderEcr(); break;
      case 'eks': await renderEks(); break;
      case 'batch': await renderBatch(); break;
      case 'codebuild': await renderCodeBuild(); break;
      case 'elasticbeanstalk': await renderElasticBeanstalk(); break;
      case 'vpc': await renderVpc(); break;
      case 'ebs': await renderEbs(); break;
      case 'efs': await renderEfs(); break;
      case 'backup': await renderBackup(); break;
      case 's3tables': await renderS3Tables(); break;
      case 's3vectors': await renderS3Vectors(); break;
      case 's3files': await renderS3Files(); break;
      case 'cloudwatch': await renderCloudWatch(); break;
      case 'eventbridge': await renderEventBridge(); break;
      case 'sqs': await renderSqs(); break;
      case 'sns': await renderSns(); break;
      case 'stepfunctions': await renderStepFunctions(); break;
      case 'scheduler': await renderScheduler(); break;
      case 'pipes': await renderPipes(); break;
      case 'mq': await renderMq(); break;
      case 'iam': await renderIam(); break;
      case 'sts': await renderSts(); break;
      case 'secretsmanager': await renderSecrets(); break;
      case 'ssm': await renderSsm(); break;
      case 'kms': await renderKms(); break;
      case 'cognito': await renderCognito(); break;
      case 'acm': await renderAcm(); break;
      case 'waf': await renderWaf(); break;
      case 'inspector2': await renderInspector2(); break;
      case 'elasticache': await renderElastiCache(); break;
      case 'memorydb': await renderMemoryDb(); break;
      case 'docdb': await renderDocDb(); break;
      case 'neptune': await renderNeptune(); break;
      case 'opensearch': await renderOpenSearch(); break;
      case 'rdsdata': await renderRdsData(); break;
      case 'kinesis': await renderKinesis(); break;
      case 'firehose': await renderFirehose(); break;
      case 'emr': await renderEmr(); break;
      case 'kafka': await renderKafka(); break;
      case 'apigateway': await renderApiGateway(); break;
      case 'apigatewayv2': await renderApiGatewayV2(); break;
      case 'route53': await renderRoute53(); break;
      case 'cloudfront': await renderCloudFront(); break;
      case 'cloudfrontkvs': await renderCfKvs(); break;
      case 'elbv2': await renderElbv2(); break;
      case 'appsync': await renderAppSync(); break;
      case 'cloudmap': await renderCloudMap(); break;
      case 'cloudformation': await renderCloudFormation(); break;
      case 'autoscaling': await renderAutoScaling(); break;
      case 'appconfig': await renderAppConfig(); break;
      case 'resourcegroupstagging': await renderResourceGroupsTagging(); break;
      case 'awsconfig': await renderAwsConfig(); break;
      case 'cloudtrail': await renderCloudTrail(); break;
      case 'organizations': await renderOrganizations(); break;
      case 'account': await renderAccount(); break;
      case 'codedeploy': await renderCodeDeploy(); break;
      case 'codepipeline': await renderCodePipeline(); break;
      case 'costexplorer': await renderCostExplorer(); break;
      case 'pricing': await renderPricing(); break;
      case 'cur': await renderCur(); break;
      case 'ses': await renderSes(); break;
      case 'transfer': await renderTransfer(); break;
      case 'iot': await renderIot(); break;
      case 'lakeformation': await renderLakeFormation(); break;
    }
  } catch (e) { content.innerHTML = formatError(e); }
}

init();

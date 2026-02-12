import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/cloudprep';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create AWS Cloud Practitioner exam type
  const awsCcp = await prisma.examType.upsert({
    where: { id: 'aws-ccp' },
    update: {},
    create: {
      id: 'aws-ccp',
      name: 'AWS Certified Cloud Practitioner',
      displayName: 'AWS CCP',
      description:
        'The AWS Certified Cloud Practitioner validates foundational, high-level understanding of AWS Cloud, services, and terminology.',
      domains: [
        {
          id: 'cloud-concepts',
          name: 'Cloud Concepts',
          weight: 24,
          questionCount: 16,
        },
        {
          id: 'security',
          name: 'Security and Compliance',
          weight: 30,
          questionCount: 20,
        },
        {
          id: 'technology',
          name: 'Technology',
          weight: 34,
          questionCount: 22,
        },
        {
          id: 'billing',
          name: 'Billing and Pricing',
          weight: 12,
          questionCount: 7,
        },
      ],
      passingScore: 70,
      timeLimit: 90,
      questionCount: 65,
      isActive: true,
    },
  });

  console.log(`✅ Created exam type: ${awsCcp.name} (${awsCcp.id})`);

  // Create initial SyncVersion for AWS CCP
  await prisma.syncVersion.upsert({
    where: { examTypeId: 'aws-ccp' },
    update: {},
    create: {
      examTypeId: 'aws-ccp',
      version: 1,
    },
  });

  console.log('✅ Created sync version for aws-ccp');

  // Create sample admin user (password: admin123)
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@cloudprep.io' },
    update: {},
    create: {
      email: 'admin@cloudprep.io',
      passwordHash,
      name: 'CloudPrep Admin',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create sample questions - 70+ for all domains
  const sampleQuestions = generateSampleQuestions(admin.id);

  // Clear existing questions first
  await prisma.question.deleteMany({
    where: { examTypeId: 'aws-ccp' },
  });

  for (const question of sampleQuestions) {
    await prisma.question.create({
      data: question,
    });
  }

  console.log(`✅ Created ${sampleQuestions.length} sample questions`);

  console.log('🎉 Seeding complete!');
}

/**
 * Generate 70+ sample AWS CCP questions for testing
 */
function generateSampleQuestions(adminId: string) {
  const questions: Array<{
    examTypeId: string;
    text: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    domain: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    options: { id: string; text: string }[];
    correctAnswers: string[];
    explanation: string;
    status: 'APPROVED';
    createdById: string;
    approvedById: string;
    approvedAt: Date;
  }> = [];

  const now = new Date();

  // Cloud Concepts Domain (16 questions)
  const cloudConcepts = [
    {
      text: 'What is the main benefit of the pay-as-you-go pricing model in cloud computing?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Fixed monthly costs' },
        { id: 'b', text: 'Pay only for resources you use' },
        { id: 'c', text: 'Free unlimited usage' },
        { id: 'd', text: 'Annual billing discounts' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Pay-as-you-go means you only pay for the compute power, storage, and other resources you use, with no long-term contracts or upfront commitments.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which of the following best describes cloud elasticity?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        {
          id: 'a',
          text: 'The ability to acquire resources as you need them and release them when you no longer need them',
        },
        {
          id: 'b',
          text: 'The ability to run applications on multiple servers',
        },
        { id: 'c', text: 'The ability to back up data automatically' },
        { id: 'd', text: 'The ability to access resources from anywhere' },
      ],
      correctAnswers: ['a'],
      explanation:
        'Elasticity is the ability to automatically scale computing resources up or down based on demand.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which of the following are benefits of cloud computing? (Select TWO)',
      type: 'MULTIPLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Trade variable expense for capital expense' },
        { id: 'b', text: 'Benefit from massive economies of scale' },
        { id: 'c', text: 'Stop guessing about capacity' },
        { id: 'd', text: 'Increase data center staffing' },
        { id: 'e', text: 'Maintain physical servers' },
      ],
      correctAnswers: ['b', 'c'],
      explanation:
        'Cloud benefits include economies of scale and eliminating capacity guessing. You trade capital expense for variable expense, not the reverse.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What does "high availability" mean in cloud computing?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Resources are available at low cost' },
        {
          id: 'b',
          text: 'Systems are designed to operate continuously without failure',
        },
        { id: 'c', text: 'Data is stored in multiple formats' },
        { id: 'd', text: 'Applications run faster than on-premises' },
      ],
      correctAnswers: ['b'],
      explanation:
        'High availability refers to systems designed to be available for as much time as possible, minimizing downtime.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which cloud deployment model keeps all resources within a single organization?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Public cloud' },
        { id: 'b', text: 'Private cloud' },
        { id: 'c', text: 'Hybrid cloud' },
        { id: 'd', text: 'Community cloud' },
      ],
      correctAnswers: ['b'],
      explanation:
        'A private cloud is dedicated to a single organization and provides greater control over resources and security.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is a hybrid cloud?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A cloud shared between two companies' },
        { id: 'b', text: 'A combination of public and private cloud' },
        { id: 'c', text: 'A cloud that only uses renewable energy' },
        { id: 'd', text: 'A cloud with both Windows and Linux servers' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Hybrid cloud combines on-premises infrastructure with public cloud services, allowing data and applications to be shared between them.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is the AWS Well-Architected Framework?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A billing optimization tool' },
        {
          id: 'b',
          text: 'A set of best practices for building secure, reliable, and efficient infrastructure',
        },
        { id: 'c', text: 'A server monitoring service' },
        { id: 'd', text: 'A database management system' },
      ],
      correctAnswers: ['b'],
      explanation:
        'The AWS Well-Architected Framework provides best practices across five pillars: operational excellence, security, reliability, performance efficiency, and cost optimization.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which of the following is a pillar of the AWS Well-Architected Framework?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Scalability' },
        { id: 'b', text: 'Cost Optimization' },
        { id: 'c', text: 'Virtualization' },
        { id: 'd', text: 'Containerization' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Cost Optimization is one of the five pillars of the AWS Well-Architected Framework.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is the benefit of using multiple Availability Zones?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Lower costs' },
        { id: 'b', text: 'Increased fault tolerance and high availability' },
        { id: 'c', text: 'Faster application performance' },
        { id: 'd', text: 'Simplified management' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Using multiple Availability Zones provides fault tolerance and high availability by distributing resources across physically separate data centers.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is an AWS Region?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A single data center' },
        {
          id: 'b',
          text: 'A geographical area containing multiple Availability Zones',
        },
        { id: 'c', text: 'A virtual network' },
        { id: 'd', text: 'A billing account' },
      ],
      correctAnswers: ['b'],
      explanation:
        'An AWS Region is a physical location in the world where AWS clusters data centers, containing multiple isolated Availability Zones.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Infrastructure as a Service (IaaS)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Renting fully managed applications' },
        { id: 'b', text: 'Renting virtual servers, storage, and networking' },
        { id: 'c', text: 'Using pre-built APIs' },
        { id: 'd', text: 'Outsourcing IT support' },
      ],
      correctAnswers: ['b'],
      explanation:
        'IaaS provides virtualized computing resources over the internet, including servers, storage, and networking infrastructure.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which cloud service model provides the most control over IT resources?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'SaaS' },
        { id: 'b', text: 'PaaS' },
        { id: 'c', text: 'IaaS' },
        { id: 'd', text: 'FaaS' },
      ],
      correctAnswers: ['c'],
      explanation:
        'IaaS provides the most control as you manage virtual machines, storage, and networking while the provider manages the physical infrastructure.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is the difference between scalability and elasticity?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'They are the same thing' },
        { id: 'b', text: 'Scalability is manual, elasticity is automatic' },
        {
          id: 'c',
          text: 'Scalability is for storage, elasticity is for compute',
        },
        { id: 'd', text: 'Scalability is for databases only' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Scalability is the ability to increase resources, while elasticity is the ability to automatically scale resources up or down based on demand.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What does "fault tolerance" mean?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'The system never has any errors' },
        {
          id: 'b',
          text: 'The system continues operating even when components fail',
        },
        { id: 'c', text: 'The system reports all errors immediately' },
        { id: 'd', text: 'The system automatically fixes bugs' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Fault tolerance is the ability of a system to continue operating correctly even when one or more of its components fail.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is "serverless" computing?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Computing without any servers' },
        {
          id: 'b',
          text: 'Computing where the cloud provider manages server infrastructure',
        },
        { id: 'c', text: 'Computing using only containers' },
        { id: 'd', text: 'Computing without an internet connection' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Serverless computing means the cloud provider manages the server infrastructure so developers can focus on code without worrying about servers.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which AWS service is an example of Platform as a Service (PaaS)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon EC2' },
        { id: 'b', text: 'AWS Elastic Beanstalk' },
        { id: 'c', text: 'Amazon S3' },
        { id: 'd', text: 'AWS Direct Connect' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Elastic Beanstalk is a PaaS that handles infrastructure provisioning so developers can focus on deploying applications.',
      difficulty: 'MEDIUM' as const,
    },
  ];

  // Security Domain (20 questions)
  const securityQuestions = [
    {
      text: 'What is the AWS shared responsibility model?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS is responsible for everything' },
        { id: 'b', text: 'The customer is responsible for everything' },
        {
          id: 'c',
          text: 'AWS secures the cloud, customers secure what they put in the cloud',
        },
        { id: 'd', text: 'Security is optional' },
      ],
      correctAnswers: ['c'],
      explanation:
        'The shared responsibility model means AWS secures the infrastructure (security OF the cloud) while customers secure their data and applications (security IN the cloud).',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service provides identity and access management?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS Shield' },
        { id: 'b', text: 'AWS IAM' },
        { id: 'c', text: 'AWS WAF' },
        { id: 'd', text: 'AWS KMS' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS IAM (Identity and Access Management) enables you to manage access to AWS services and resources securely.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is the principle of least privilege?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        {
          id: 'a',
          text: 'Give users all permissions to make their job easier',
        },
        { id: 'b', text: 'Give users only the minimum permissions they need' },
        { id: 'c', text: 'Remove all permissions from users' },
        { id: 'd', text: 'Share passwords among team members' },
      ],
      correctAnswers: ['b'],
      explanation:
        'The principle of least privilege means granting only the permissions required to perform a task, reducing security risk.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is multi-factor authentication (MFA)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Using multiple passwords' },
        { id: 'b', text: 'Using something you know plus something you have' },
        { id: 'c', text: 'Logging in from multiple devices' },
        { id: 'd', text: 'Having multiple user accounts' },
      ],
      correctAnswers: ['b'],
      explanation:
        'MFA requires two or more verification factors: something you know (password), something you have (token), or something you are (biometrics).',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service protects against DDoS attacks?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS IAM' },
        { id: 'b', text: 'AWS Shield' },
        { id: 'c', text: 'AWS KMS' },
        { id: 'd', text: 'AWS Inspector' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Shield is a managed DDoS protection service that safeguards applications running on AWS.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What does AWS KMS do?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Monitors application performance' },
        { id: 'b', text: 'Creates and manages encryption keys' },
        { id: 'c', text: 'Manages user permissions' },
        { id: 'd', text: 'Provides DDoS protection' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Key Management Service (KMS) makes it easy to create and manage cryptographic keys for encryption.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is an IAM role?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A permanent user account' },
        {
          id: 'b',
          text: 'A set of permissions that can be assumed by users or services',
        },
        { id: 'c', text: 'A billing account' },
        { id: 'd', text: 'A network configuration' },
      ],
      correctAnswers: ['b'],
      explanation:
        'An IAM role is a set of permissions that define what actions are allowed, and can be assumed by users, applications, or AWS services.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is an IAM policy?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A document that defines permissions' },
        { id: 'b', text: 'A user account' },
        { id: 'c', text: 'A billing rule' },
        { id: 'd', text: 'A server configuration' },
      ],
      correctAnswers: ['a'],
      explanation:
        'An IAM policy is a JSON document that defines permissions for making requests to AWS services.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which service provides a web application firewall?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS Shield' },
        { id: 'b', text: 'AWS WAF' },
        { id: 'c', text: 'AWS GuardDuty' },
        { id: 'd', text: 'AWS Inspector' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS WAF (Web Application Firewall) helps protect web applications from common web exploits.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What does AWS GuardDuty do?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Manages encryption keys' },
        { id: 'b', text: 'Provides threat detection' },
        { id: 'c', text: 'Creates VPCs' },
        { id: 'd', text: 'Monitors costs' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS GuardDuty is a threat detection service that continuously monitors for malicious activity and unauthorized behavior.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is encryption at rest?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Encrypting data while it is being transmitted' },
        { id: 'b', text: 'Encrypting data while it is stored' },
        { id: 'c', text: 'Encrypting the network' },
        { id: 'd', text: 'Encrypting user passwords' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Encryption at rest protects data stored on disk, databases, or other storage media.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is encryption in transit?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Encrypting stored data' },
        { id: 'b', text: 'Encrypting data as it moves between systems' },
        { id: 'c', text: 'Encrypting backup data' },
        { id: 'd', text: 'Encrypting log files' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Encryption in transit protects data as it travels over a network, typically using TLS/SSL.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service helps you assess security vulnerabilities in EC2 instances?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS Inspector' },
        { id: 'b', text: 'AWS Shield' },
        { id: 'c', text: 'AWS WAF' },
        { id: 'd', text: 'AWS KMS' },
      ],
      correctAnswers: ['a'],
      explanation:
        'AWS Inspector automatically assesses applications for vulnerabilities or deviations from best practices.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is AWS CloudTrail used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Monitoring application performance' },
        { id: 'b', text: 'Logging API calls and user activity' },
        { id: 'c', text: 'Managing encryption keys' },
        { id: 'd', text: 'Protecting against DDoS attacks' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS CloudTrail records API calls and related events made in your AWS account for auditing and compliance.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is AWS Secrets Manager used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Managing IAM users' },
        {
          id: 'b',
          text: 'Storing and rotating secrets like database credentials',
        },
        { id: 'c', text: 'Encrypting S3 buckets' },
        { id: 'd', text: 'Creating VPCs' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Secrets Manager helps protect secrets needed to access applications, services, and IT resources.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is a security group in AWS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A group of IAM users' },
        { id: 'b', text: 'A virtual firewall for EC2 instances' },
        { id: 'c', text: 'A billing category' },
        { id: 'd', text: 'A collection of S3 buckets' },
      ],
      correctAnswers: ['b'],
      explanation:
        'A security group acts as a virtual firewall that controls inbound and outbound traffic for EC2 instances.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which of the following is customer responsibility under the shared responsibility model?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Physical security of data centers' },
        { id: 'b', text: 'Configuring security groups' },
        { id: 'c', text: 'Maintaining network infrastructure' },
        { id: 'd', text: 'Patching the hypervisor' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Customers are responsible for configuring security groups, IAM permissions, and securing their data.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is AWS responsibility under the shared responsibility model?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Customer data encryption' },
        { id: 'b', text: 'Physical data center security' },
        { id: 'c', text: 'Application code security' },
        { id: 'd', text: 'IAM user management' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS is responsible for the security OF the cloud, including physical data centers, networking hardware, and the hypervisor.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is AWS Organizations used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Managing multiple AWS accounts' },
        { id: 'b', text: 'Creating EC2 instances' },
        { id: 'c', text: 'Storing files' },
        { id: 'd', text: 'Monitoring applications' },
      ],
      correctAnswers: ['a'],
      explanation:
        'AWS Organizations helps centrally manage and govern multiple AWS accounts with consolidated billing and service control policies.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What are Service Control Policies (SCPs)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Policies to control AWS service costs' },
        {
          id: 'b',
          text: 'Policies to control what services and actions are available in AWS accounts',
        },
        { id: 'c', text: 'Policies to control network traffic' },
        { id: 'd', text: 'Policies to control data backups' },
      ],
      correctAnswers: ['b'],
      explanation:
        'SCPs are a type of organization policy that you can use to manage permissions across your AWS organization.',
      difficulty: 'HARD' as const,
    },
  ];

  // Technology Domain (22 questions)
  const technologyQuestions = [
    {
      text: 'Which AWS service provides a fully managed NoSQL database?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon RDS' },
        { id: 'b', text: 'Amazon DynamoDB' },
        { id: 'c', text: 'Amazon Redshift' },
        { id: 'd', text: 'Amazon Aurora' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Amazon EC2?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A storage service' },
        { id: 'b', text: 'A virtual server in the cloud' },
        { id: 'c', text: 'A database service' },
        { id: 'd', text: 'A content delivery network' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon EC2 (Elastic Compute Cloud) provides resizable compute capacity as virtual servers in the cloud.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Amazon S3?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A compute service' },
        { id: 'b', text: 'An object storage service' },
        { id: 'c', text: 'A database service' },
        { id: 'd', text: 'A networking service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon S3 (Simple Storage Service) is an object storage service offering industry-leading scalability, availability, and durability.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service is used to automate infrastructure provisioning using code?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS CloudFormation' },
        { id: 'b', text: 'AWS Config' },
        { id: 'c', text: 'AWS CloudTrail' },
        { id: 'd', text: 'AWS Systems Manager' },
      ],
      correctAnswers: ['a'],
      explanation:
        'AWS CloudFormation enables you to model and provision AWS resources using infrastructure as code.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is Amazon VPC?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        {
          id: 'a',
          text: 'A virtual private cloud for launching AWS resources',
        },
        { id: 'b', text: 'A content delivery network' },
        { id: 'c', text: 'A database service' },
        { id: 'd', text: 'A monitoring service' },
      ],
      correctAnswers: ['a'],
      explanation:
        'Amazon VPC lets you provision a logically isolated section of the AWS Cloud where you can launch AWS resources.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What does Amazon RDS provide?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'NoSQL database hosting' },
        { id: 'b', text: 'Managed relational database service' },
        { id: 'c', text: 'File storage' },
        { id: 'd', text: 'Container orchestration' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon RDS (Relational Database Service) makes it easy to set up, operate, and scale relational databases in the cloud.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service is a content delivery network (CDN)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon S3' },
        { id: 'b', text: 'Amazon CloudFront' },
        { id: 'c', text: 'Amazon EC2' },
        { id: 'd', text: 'Amazon Route 53' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon CloudFront is a fast content delivery network service that securely delivers data, videos, applications globally.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is AWS Lambda?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A virtual machine service' },
        { id: 'b', text: 'A serverless compute service' },
        { id: 'c', text: 'A database service' },
        { id: 'd', text: 'A storage service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Lambda lets you run code without provisioning or managing servers. You pay only for the compute time you consume.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service provides DNS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon CloudFront' },
        { id: 'b', text: 'Amazon Route 53' },
        { id: 'c', text: 'AWS Direct Connect' },
        { id: 'd', text: 'Amazon VPC' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Amazon EBS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Object storage' },
        { id: 'b', text: 'Block storage for EC2 instances' },
        { id: 'c', text: 'File storage' },
        { id: 'd', text: 'Archive storage' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon EBS (Elastic Block Store) provides persistent block storage volumes for use with Amazon EC2 instances.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Amazon EFS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Block storage' },
        { id: 'b', text: 'Object storage' },
        { id: 'c', text: 'Scalable file storage' },
        { id: 'd', text: 'Archive storage' },
      ],
      correctAnswers: ['c'],
      explanation:
        'Amazon EFS (Elastic File System) provides simple, scalable file storage for use with AWS Cloud services and on-premises resources.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which service provides container orchestration?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon EC2' },
        { id: 'b', text: 'Amazon ECS' },
        { id: 'c', text: 'Amazon S3' },
        { id: 'd', text: 'Amazon RDS' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon ECS (Elastic Container Service) is a fully managed container orchestration service.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is Amazon SQS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A database service' },
        { id: 'b', text: 'A message queuing service' },
        { id: 'c', text: 'A compute service' },
        { id: 'd', text: 'A storage service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon SQS (Simple Queue Service) is a fully managed message queuing service for decoupling distributed systems.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is Amazon SNS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A storage service' },
        { id: 'b', text: 'A pub/sub messaging service' },
        { id: 'c', text: 'A database service' },
        { id: 'd', text: 'A compute service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon SNS (Simple Notification Service) is a fully managed pub/sub messaging service for sending notifications.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which AWS service provides load balancing?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon Route 53' },
        { id: 'b', text: 'Elastic Load Balancing (ELB)' },
        { id: 'c', text: 'Amazon CloudFront' },
        { id: 'd', text: 'AWS Direct Connect' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Elastic Load Balancing automatically distributes incoming application traffic across multiple targets.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Auto Scaling in AWS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Manual server provisioning' },
        {
          id: 'b',
          text: 'Automatic adjustment of compute capacity based on demand',
        },
        { id: 'c', text: 'A billing feature' },
        { id: 'd', text: 'A storage service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Auto Scaling monitors your applications and automatically adjusts capacity to maintain steady, predictable performance.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Amazon Glacier used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'High-performance computing' },
        { id: 'b', text: 'Low-cost archive storage' },
        { id: 'c', text: 'Real-time database' },
        { id: 'd', text: 'Content delivery' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon S3 Glacier is a low-cost storage class designed for data archiving and long-term backup.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which AWS service monitors resources and applications?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon CloudWatch' },
        { id: 'b', text: 'AWS CloudTrail' },
        { id: 'c', text: 'AWS Config' },
        { id: 'd', text: 'AWS X-Ray' },
      ],
      correctAnswers: ['a'],
      explanation:
        'Amazon CloudWatch is a monitoring and observability service that provides data and actionable insights.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is AWS Elastic Beanstalk?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A database service' },
        { id: 'b', text: 'A PaaS for deploying applications' },
        { id: 'c', text: 'A storage service' },
        { id: 'd', text: 'A networking service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Elastic Beanstalk is a PaaS that makes it easy to deploy, manage, and scale applications.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is Amazon Redshift?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A NoSQL database' },
        { id: 'b', text: 'A data warehouse service' },
        { id: 'c', text: 'A compute service' },
        { id: 'd', text: 'A networking service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Amazon Redshift is a fully managed data warehouse that makes it simple to analyze data using SQL.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is AWS Direct Connect?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A VPN service' },
        { id: 'b', text: 'A dedicated network connection to AWS' },
        { id: 'c', text: 'An internet service provider' },
        { id: 'd', text: 'A DNS service' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Direct Connect provides a dedicated private connection from your data center to AWS.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which AWS service is used for machine learning?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Amazon Rekognition' },
        { id: 'b', text: 'Amazon RDS' },
        { id: 'c', text: 'Amazon S3' },
        { id: 'd', text: 'Amazon VPC' },
      ],
      correctAnswers: ['a'],
      explanation:
        'Amazon Rekognition is a machine learning service that makes it easy to add image and video analysis to applications.',
      difficulty: 'MEDIUM' as const,
    },
  ];

  // Billing Domain (12 questions - expanded from 7)
  const billingQuestions = [
    {
      text: 'Which AWS service helps you visualize and manage AWS costs?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS Budgets' },
        { id: 'b', text: 'AWS Cost Explorer' },
        { id: 'c', text: 'AWS Pricing Calculator' },
        { id: 'd', text: 'AWS Config' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Cost Explorer lets you visualize, understand, and manage your AWS costs and usage over time.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is the AWS Free Tier?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A discount program for large enterprises' },
        {
          id: 'b',
          text: 'Free access to certain AWS services for a limited time or usage',
        },
        { id: 'c', text: 'A support plan' },
        { id: 'd', text: 'A training program' },
      ],
      correctAnswers: ['b'],
      explanation:
        'The AWS Free Tier enables you to gain free, hands-on experience with AWS services.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What are Reserved Instances?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'On-demand instances with no commitment' },
        {
          id: 'b',
          text: 'Instances reserved for a 1 or 3 year term with significant discount',
        },
        { id: 'c', text: 'Free instances for testing' },
        { id: 'd', text: 'Instances that run at fixed times' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Reserved Instances provide a significant discount compared to On-Demand pricing in exchange for a commitment to use the instance for 1 or 3 years.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is Spot pricing in AWS?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Fixed pricing for all services' },
        { id: 'b', text: 'Bidding on unused EC2 capacity at discounted rates' },
        { id: 'c', text: 'Premium pricing for priority access' },
        { id: 'd', text: 'Pay-as-you-go pricing' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Spot Instances let you use spare EC2 computing capacity at up to 90% discount compared to On-Demand prices.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What does consolidate billing in AWS Organizations enable?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Separate billing for each account' },
        { id: 'b', text: 'One bill for multiple AWS accounts' },
        { id: 'c', text: 'Free services for all accounts' },
        { id: 'd', text: 'Automatic cost reduction' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Consolidated billing combines usage from all accounts and shares volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which support plan provides a dedicated Technical Account Manager (TAM)?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Basic' },
        { id: 'b', text: 'Developer' },
        { id: 'c', text: 'Business' },
        { id: 'd', text: 'Enterprise' },
      ],
      correctAnswers: ['d'],
      explanation:
        'The Enterprise Support plan includes a designated Technical Account Manager (TAM) to provide proactive guidance.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'What is AWS Budgets used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Creating EC2 instances' },
        { id: 'b', text: 'Setting custom cost and usage budgets with alerts' },
        { id: 'c', text: 'Managing IAM users' },
        { id: 'd', text: 'Deploying applications' },
      ],
      correctAnswers: ['b'],
      explanation:
        'AWS Budgets lets you set custom cost and usage budgets and receive alerts when you exceed or are forecasted to exceed your thresholds.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is the AWS Pricing Calculator used for?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Viewing past bills' },
        { id: 'b', text: 'Estimating AWS service costs' },
        { id: 'c', text: 'Paying AWS bills' },
        { id: 'd', text: 'Managing discounts' },
      ],
      correctAnswers: ['b'],
      explanation:
        'The AWS Pricing Calculator lets you estimate the cost for your architecture solution.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'Which pricing model offers the lowest cost for predictable workloads?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'On-Demand' },
        { id: 'b', text: 'Reserved Instances' },
        { id: 'c', text: 'Spot Instances' },
        { id: 'd', text: 'Dedicated Hosts' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Reserved Instances offer significant savings over On-Demand pricing for workloads with predictable usage.',
      difficulty: 'EASY' as const,
    },
    {
      text: 'What is a Savings Plan?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'A free tier offering' },
        {
          id: 'b',
          text: 'A flexible pricing model that offers savings on compute usage',
        },
        { id: 'c', text: 'A support plan' },
        { id: 'd', text: 'A training program' },
      ],
      correctAnswers: ['b'],
      explanation:
        'Savings Plans offer flexible pricing for compute usage in exchange for a commitment to a consistent amount of usage.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'How does AWS charge for data transfer?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'Data in and data out are both free' },
        { id: 'b', text: 'Data in is free, data out is charged' },
        { id: 'c', text: 'Data in is charged, data out is free' },
        { id: 'd', text: 'Both data in and out are always charged' },
      ],
      correctAnswers: ['b'],
      explanation:
        'In general, data transferred into AWS from the internet is free, while data transferred out to the internet is charged.',
      difficulty: 'MEDIUM' as const,
    },
    {
      text: 'Which tool can help identify unused or underutilized resources?',
      type: 'SINGLE_CHOICE' as const,
      options: [
        { id: 'a', text: 'AWS Trusted Advisor' },
        { id: 'b', text: 'AWS CloudFormation' },
        { id: 'c', text: 'AWS Lambda' },
        { id: 'd', text: 'Amazon S3' },
      ],
      correctAnswers: ['a'],
      explanation:
        'AWS Trusted Advisor provides recommendations to help you follow AWS best practices, including cost optimization.',
      difficulty: 'EASY' as const,
    },
  ];

  // Add questions with metadata
  for (const q of cloudConcepts) {
    questions.push({
      examTypeId: 'aws-ccp',
      domain: 'cloud-concepts',
      status: 'APPROVED',
      createdById: adminId,
      approvedById: adminId,
      approvedAt: now,
      ...q,
    });
  }

  for (const q of securityQuestions) {
    questions.push({
      examTypeId: 'aws-ccp',
      domain: 'security',
      status: 'APPROVED',
      createdById: adminId,
      approvedById: adminId,
      approvedAt: now,
      ...q,
    });
  }

  for (const q of technologyQuestions) {
    questions.push({
      examTypeId: 'aws-ccp',
      domain: 'technology',
      status: 'APPROVED',
      createdById: adminId,
      approvedById: adminId,
      approvedAt: now,
      ...q,
    });
  }

  for (const q of billingQuestions) {
    questions.push({
      examTypeId: 'aws-ccp',
      domain: 'billing',
      status: 'APPROVED',
      createdById: adminId,
      approvedById: adminId,
      approvedAt: now,
      ...q,
    });
  }

  return questions;
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Procurement AI Demo Script
// This demonstrates the AI-powered procurement analysis system

import { AnalystAgent, StrategistAgent, WriterAgent } from './src/services/procurementAgents';
import { getSampleTenders } from './src/data/sampleTenders';
import { getCompanyProfile } from './src/data/companyProfile';

const main = async () => {
  console.log('🤖 AI Procurement Analysis System Demo');
  console.log('=====================================\n');

  // Initialize agents
  const analyst = new AnalystAgent();
  const strategist = new StrategistAgent();
  const writer = new WriterAgent();

  // Get sample data
  const tenders = getSampleTenders();
  const companyProfile = getCompanyProfile();

  console.log(`📊 Company Profile: ${companyProfile.overview.name}`);
  console.log(`   Services: ${companyProfile.services.primary.join(', ')}`);
  console.log(`   Team Size: ${companyProfile.personnel.totalStaff} people`);
  console.log(`   Past Projects: ${companyProfile.pastProjects.length} major projects\n`);

  // Select first tender for demo
  const tender = tenders[0];
  console.log(`🎯 Analyzing Tender: ${tender.title}`);
  console.log(`   Client: ${tender.client}`);
  console.log(`   Value: £${tender.value.toLocaleString()}`);
  console.log(`   Location: ${tender.location}`);
  console.log(`   Requirements: ${tender.requirements.length} key requirements\n`);

  try {
    // Step 1: Analysis
    console.log('🔍 Step 1: AI Analysis in progress...');
    const analysis = await analyst.analyzeTender(tender, companyProfile);
    console.log(`✅ Analysis Complete - Feasibility Score: ${analysis.feasibilityScore}/10`);
    console.log(`   Key Strengths: ${analysis.keyStrengths.slice(0, 2).join(', ')}`);
    console.log(`   Risk Level: ${analysis.riskAssessment.overall}\n`);

    // Step 2: Strategy
    console.log('🎯 Step 2: Win Strategy Development...');
    const strategy = await strategist.developStrategy(analysis, tender, companyProfile);
    console.log(`✅ Strategy Complete - Win Probability: ${strategy.winProbability}%`);
    console.log(`   Primary Theme: ${strategy.primaryTheme}`);
    console.log(`   Key Differentiators: ${strategy.keyDifferentiators.slice(0, 2).join(', ')}\n`);

    // Step 3: Writing
    console.log('✍️ Step 3: Tender Response Generation...');
    const response = await writer.generateResponse(strategy, analysis, tender, companyProfile);
    console.log(`✅ Response Generated - ${response.sections.length} sections`);
    console.log(`   Executive Summary Length: ${response.sections.find(s => s.title === 'Executive Summary')?.content.length || 0} characters`);
    console.log(`   Total Word Count: ~${Math.round(response.sections.reduce((sum, s) => sum + s.content.length, 0) / 5)} words\n`);

    console.log('🎉 Procurement Analysis Complete!');
    console.log('   ✓ Tender analyzed against company capabilities');
    console.log('   ✓ Win strategy developed with key themes');
    console.log('   ✓ Professional response document generated');
    console.log('   ✓ Ready for review and submission\n');

    console.log('📋 Summary Report:');
    console.log(`   Tender: ${tender.title}`);
    console.log(`   Feasibility: ${analysis.feasibilityScore}/10`);
    console.log(`   Win Probability: ${strategy.winProbability}%`);
    console.log(`   Recommendation: ${analysis.feasibilityScore >= 7 ? '🟢 PURSUE' : analysis.feasibilityScore >= 5 ? '🟡 CONSIDER' : '🔴 DECLINE'}`);

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
};

// Uncomment to run demo:
// main().catch(console.error);

export { main as procurementDemo };
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePrecisionRatioDenominator,
  evaluateSurveyQuality,
  SurveyQualityAssessment,
} from '../components/survey/SurveyQualityReportModal';

test('Traverse Precision Parsing: accurately parses denominator from "1 in N" strings', () => {
  assert.equal(parsePrecisionRatioDenominator('1 in 12,450'), 12450);
  assert.equal(parsePrecisionRatioDenominator('1 in 4,820'), 4820);
  assert.equal(parsePrecisionRatioDenominator('1:10000'), 10000);
  assert.equal(parsePrecisionRatioDenominator('1 in 500'), 500);
  assert.equal(parsePrecisionRatioDenominator('1 in ∞ (Exact)'), Infinity);
  assert.equal(parsePrecisionRatioDenominator('N/A'), 0);
  assert.equal(parsePrecisionRatioDenominator(''), 0);
});

test('Traverse Quality Grade: relativePrecision "1 in 12,450" correctly reaches the top grade tier', () => {
  const assessment: SurveyQualityAssessment = {
    projectName: 'Field Survey Traverse',
    surveyMethod: 'traverse',
    vertexCount: 5,
    totalPerimeterMeters: 450,
    areaSqm: 12500,
    areaCents: 30.88,
    areaAcres: 0.309,
    relativePrecision: '1 in 12,450',
    linearClosingError: 0.036,
    state: 'Andhra Pradesh',
  };

  const result = evaluateSurveyQuality(assessment);

  // Top tier requirements
  assert.equal(result.grade, 'A+');
  assert.equal(result.score, 95);
  assert.ok(result.qualityTier.includes('High-Precision Closed Traverse'));
  assert.ok(result.disclaimer.includes('internal data-quality estimate'));
});

test('Traverse Quality Grade: lower precision ratios reach appropriate respective tiers', () => {
  const baseAssessment: SurveyQualityAssessment = {
    projectName: 'Field Survey Traverse',
    surveyMethod: 'traverse',
    vertexCount: 4,
    totalPerimeterMeters: 300,
    areaSqm: 5600,
    areaCents: 13.83,
    areaAcres: 0.138,
    state: 'Telangana',
  };

  // Standard closure (1:5000 to 1:9999)
  const aTier = evaluateSurveyQuality({ ...baseAssessment, relativePrecision: '1 in 6,500' });
  assert.equal(aTier.grade, 'A');
  assert.equal(aTier.score, 88);

  // Moderate closure (1:1000 to 1:4999)
  const bTier = evaluateSurveyQuality({ ...baseAssessment, relativePrecision: '1 in 2,500' });
  assert.equal(bTier.grade, 'B+');
  assert.equal(bTier.score, 80);

  // Low closure (< 1:1000)
  const cTier = evaluateSurveyQuality({ ...baseAssessment, relativePrecision: '1 in 650' });
  assert.equal(cTier.grade, 'C');
  assert.equal(cTier.score, 65);
});

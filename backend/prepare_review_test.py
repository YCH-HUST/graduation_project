import os
import django
import sys
import json

# Setup Django environment
sys.path.append('/Users/yangchenghao/PycharmProjects/graduation_project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.cases.models import Case
from apps.pipeline.models import PipelineRun

def allow_review_for_case(case_id):
    try:
        case = Case.objects.get(id=case_id)
        print(f"Found case {case.id}, current status: {case.status}")
        
        # Ensure status is pending_review
        case.status = 'pending_review'
        case.save()
        print(f"Updated case status to: {case.status}")
        
        # Check pipeline run
        run = case.pipeline_runs.order_by('-created_at').first()
        if run:
            print(f"Found pipeline run {run.id}, status: {run.status}")
            if not run.inference_result_json:
                print("Warning: No inference_result_json in latest run. Injecting mock result.")
                run.inference_result_json = {
                    "syndromes": [{"name": "Mock Syndrome A", "score": 0.85}],
                    "formulas": [{"name": "Mock Formula B", "score": 0.90, "indication": "Test indication"}]
                }
                run.save()
                print("Injected mock diagnosis result.")
            else:
                print("Diagnosis result exists.")
        else:
            print("No pipeline run found. Creating one.")
            PipelineRun.objects.create(
                case=case,
                status='completed',
                progress=100,
                inference_result_json={
                    "syndromes": [{"name": "Mock Syndrome A", "score": 0.85}],
                    "formulas": [{"name": "Mock Formula B", "score": 0.90, "indication": "Test indication"}]
                }
            )
            print("Created mock pipeline run.")
            
    except Case.DoesNotExist:
        print(f"Case {case_id} not found.")

if __name__ == '__main__':
    # Use the known case ID
    case_id = 'cd174756-e82d-4e0f-b219-ef93ecd343ac'
    allow_review_for_case(case_id)

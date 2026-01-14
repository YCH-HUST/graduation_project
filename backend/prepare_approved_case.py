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

def set_case_approved(case_id):
    try:
        case = Case.objects.get(id=case_id)
        print(f"Found case {case.id}, current status: {case.status}")
        
        # Set status to approved
        case.status = 'approved'
        case.save()
        print(f"Updated case status to: {case.status}")
        
        # Ensure pipeline run exists with results
        run = case.pipeline_runs.order_by('-created_at').first()
        if run:
            if not run.inference_result_json:
                run.inference_result_json = {
                    "syndromes": [{"name": "Mock Syndrome A", "score": 0.85}],
                    "formulas": [{"name": "Mock Formula B", "score": 0.90, "indication": "Test indication"}]
                }
                run.save()
                print("Injected mock inference result.")
        else:
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
    # Use the same case ID as before
    case_id = 'cd174756-e82d-4e0f-b219-ef93ecd343ac'
    set_case_approved(case_id)

import os
import django
import sys
import json

# Setup Django environment
sys.path.append('/Users/yangchenghao/PycharmProjects/graduation_project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.cases.models import Case, Review

def verify_review(case_id):
    try:
        case = Case.objects.get(id=case_id)
        print(f"Case {case.id} status: {case.status}")
        
        review = Review.objects.filter(case=case).order_by('-created_at').first()
        if review:
            print(f"Found review: {review.id}")
            print(f"Decision: {review.decision}")
            print(f"Edited Syndrome JSON: {json.dumps(review.edited_syndrome_json, ensure_ascii=False)}")
            
            # Check for specific edit
            syndromes = review.edited_syndrome_json
            found = False
            if isinstance(syndromes, list):
                for s in syndromes:
                     if s.get('name') == 'Revised Syndrome A':
                         found = True
                         break
            
            if found:
                print("SUCCESS: Found 'Revised Syndrome A' in edited syndromes.")
            else:
                print("FAILURE: 'Revised Syndrome A' not found in edited syndromes.")
                
        else:
            print("No review found for case.")
            
    except Case.DoesNotExist:
        print(f"Case {case_id} not found.")

if __name__ == '__main__':
    case_id = 'cd174756-e82d-4e0f-b219-ef93ecd343ac'
    verify_review(case_id)

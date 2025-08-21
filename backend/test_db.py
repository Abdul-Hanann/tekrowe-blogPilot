#!/usr/bin/env python3
"""
Simple test script to verify database structure
"""

import sqlite3
import os

def test_database():
    db_path = "blog_automation.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check table structure
        cursor.execute("PRAGMA table_info(blogs)")
        columns = cursor.fetchall()
        
        print("Database columns:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # Check if new columns exist
        column_names = [col[1] for col in columns]
        new_columns = ['last_activity', 'process_started_at', 'step_completion_status', 'retry_count', 'is_paused']
        
        print("\nNew columns status:")
        for col in new_columns:
            if col in column_names:
                print(f"  ✓ {col}")
            else:
                print(f"  ✗ {col}")
        
        # Check sample data
        cursor.execute("SELECT COUNT(*) FROM blogs")
        blog_count = cursor.fetchone()[0]
        print(f"\nTotal blogs in database: {blog_count}")
        
        if blog_count > 0:
            cursor.execute("SELECT id, title, status FROM blogs LIMIT 3")
            blogs = cursor.fetchall()
            print("\nSample blogs:")
            for blog in blogs:
                print(f"  ID: {blog[0]}, Title: {blog[1]}, Status: {blog[2]}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_database()

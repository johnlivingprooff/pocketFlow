import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import {
  Category,
  getCategories,
  getSubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesHierarchy,
} from '@/lib/db/categories';
import { error as logError, log } from '@/utils/logger';

type CategoryType = 'income' | 'expense';

interface CategoryWithChildren extends Category {
  children?: Category[];
}

export default function CategoryManageScreen() {
  const { themeMode } = useSettings();
  const router = useRouter();
  const colors = theme(themeMode);

  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    icon: '📊',
  });

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, [categoryType]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const hierarchy = await getCategoriesHierarchy(categoryType);
      setCategories(hierarchy as any[]);
    } catch (err) {
      logError('Failed to load categories:', { error: err });
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const newCat: Category = {
        name: formData.name,
        type: categoryType,
        icon: formData.icon,
        parent_category_id: isCreatingSubcategory ? selectedParent?.id : undefined,
      };

      await createCategory(newCat);
      log(`Created ${isCreatingSubcategory ? 'sub' : ''}category: ${formData.name}`);
      
      setFormData({ name: '', icon: '📊' });
      setSelectedParent(null);
      setIsCreatingSubcategory(false);
      setCreateModalVisible(false);
      loadCategories();
      
      Alert.alert('Success', `${isCreatingSubcategory ? 'Sub' : ''}Category created`);
    } catch (err) {
      logError('Failed to create category:', { error: err });
      Alert.alert('Error', 'Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await updateCategory(editingCategory.id!, {
        name: formData.name,
        icon: formData.icon,
      });
      
      setEditingCategory(null);
      setFormData({ name: '', icon: '📊' });
      setEditModalVisible(false);
      loadCategories();
      
      Alert.alert('Success', 'Category updated');
    } catch (err) {
      logError('Failed to update category:', { error: err });
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This will also delete all subcategories.`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteCategory(category.id!);
              log(`Deleted category: ${category.name}`);
              loadCategories();
              Alert.alert('Success', 'Category deleted');
            } catch (err) {
              logError('Failed to delete category:', { error: err });
              Alert.alert('Error', 'Failed to delete category');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '📊',
    });
    setEditModalVisible(true);
  };

  const renderCategory = (category: CategoryWithChildren) => (
    <View key={category.id}>
      {/* Parent Category */}
      <View style={[styles.categoryItem, { backgroundColor: colors.card }]}>
        <View style={styles.categoryContent}>
          <Text style={[styles.categoryIcon, { fontSize: 20 }]}>{category.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {category.name}
            </Text>
            {category.children && category.children.length > 0 && (
              <Text style={[styles.subcategoryCount, { color: colors.textSecondary }]}>
                {category.children.length} subcategories
              </Text>
            )}
          </View>
        </View>
        <View style={styles.categoryActions}>
          <Pressable
            onPress={() => handleEditCategory(category)}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeleteCategory(category)}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </View>

      {/* Subcategories */}
      {category.children && category.children.map((child) => (
        <View key={child.id} style={[styles.subcategoryItem, { backgroundColor: colors.card }]}>
          <View style={styles.categoryContent}>
            <Text style={[styles.categoryIcon, { fontSize: 16, marginLeft: 24 }]}>
              {child.icon || '→'}
            </Text>
            <Text style={[styles.subcategoryName, { color: colors.textSecondary }]}>
              {child.name}
            </Text>
          </View>
          <View style={styles.categoryActions}>
            <Pressable
              onPress={() => handleEditCategory(child)}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeleteCategory(child)}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* Add Subcategory Button */}
      <Pressable
        onPress={() => {
          setSelectedParent(category);
          setIsCreatingSubcategory(true);
          setFormData({ name: '', icon: '📊' });
          setCreateModalVisible(true);
        }}
        style={[styles.addSubcategoryButton, { borderColor: colors.primary }]}
      >
        <Text style={[styles.addSubcategoryText, { color: colors.primary }]}>
          + Add Subcategory
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Type Selector */}
      <View style={[styles.typeSelector, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setCategoryType('expense')}
          style={[
            styles.typeButton,
            categoryType === 'expense' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.typeButtonText,
              { color: categoryType === 'expense' ? colors.primary : colors.textSecondary },
            ]}
          >
            Expense
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCategoryType('income')}
          style={[
            styles.typeButton,
            categoryType === 'income' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.typeButtonText,
              { color: categoryType === 'income' ? colors.primary : colors.textSecondary },
            ]}
          >
            Income
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories</Text>
          </View>
        ) : (
          categories.map(renderCategory)
        )}
      </ScrollView>

      {/* Create Button */}
      <Pressable
        onPress={() => {
          setIsCreatingSubcategory(false);
          setSelectedParent(null);
          setFormData({ name: '', icon: '📊' });
          setCreateModalVisible(true);
        }}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {isCreatingSubcategory
                  ? `Add Subcategory under ${selectedParent?.name}`
                  : 'Create Category'}
              </Text>
              <Pressable onPress={() => setCreateModalVisible(false)}>
                <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formFields}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Icon</Text>
              <TextInput
                style={[styles.iconInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text.slice(0, 2) })}
                maxLength={2}
                placeholder="📊"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Category name"
                placeholderTextColor={colors.textSecondary}
              />

              <Pressable
                onPress={handleCreateCategory}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </Pressable>

              <Pressable
                onPress={() => setCreateModalVisible(false)}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Category</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formFields}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Icon</Text>
              <TextInput
                style={[styles.iconInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text.slice(0, 2) })}
                maxLength={2}
                placeholder="📊"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Category name"
                placeholderTextColor={colors.textSecondary}
              />

              <Pressable
                onPress={handleUpdateCategory}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.submitButtonText}>Update</Text>
              </Pressable>

              <Pressable
                onPress={() => setEditModalVisible(false)}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  subcategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 4,
    marginLeft: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subcategoryCount: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addSubcategoryButton: {
    marginLeft: 24,
    marginRight: 8,
    marginBottom: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  addSubcategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  formFields: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  iconInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

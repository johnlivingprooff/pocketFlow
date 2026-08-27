import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
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
import { CATEGORY_ICONS, CategoryIconName } from '@/assets/icons/CategoryIcons';
import { error as logError, log } from '@/utils/logger';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';

type CategoryType = 'income' | 'expense';

interface CategoryWithChildren extends Category {
  children?: Category[];
}

// Helper function to determine if a string is an emoji
const isEmojiIcon = (iconValue: string): boolean => {
  if (!iconValue) return false;
  return /[\p{Emoji}]/u.test(iconValue);
};

// Helper function to render an icon (emoji or SVG)
const renderCategoryIcon = (
  iconValue: string | undefined,
  categoryName: string,
  categoryType: 'income' | 'expense' | 'both' | undefined,
  fontSize: number = 20,
  color: string = '#000'
) => {
  const icon = iconValue || '';
  if (isEmojiIcon(icon)) {
    return <Text style={{ fontSize }}>{icon}</Text>;
  }

  const iconKey = (icon || categoryName) as CategoryIconName;
  const fallbackKey: CategoryIconName = (categoryType === 'income' ? 'moneyrecive' : 'moneysend') as CategoryIconName;
  const IconComp = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS[fallbackKey];
  return IconComp ? <IconComp size={fontSize > 24 ? 24 : fontSize} color={color} /> : null;
};

export default function CategoryManageScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const colors = theme(themeMode, systemColorScheme || 'light');

  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const { alertConfig, showErrorAlert, showConfirmAlert, dismissAlert } = useAlert();

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
      showErrorAlert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      showErrorAlert('Error', 'Please enter a category name');
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
      
      showConfirmAlert('Success', `${isCreatingSubcategory ? 'Sub' : ''}Category created`, dismissAlert);
    } catch (err) {
      logError('Failed to create category:', { error: err });
      showErrorAlert('Error', 'Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      showErrorAlert('Error', 'Please enter a category name');
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
      
      showConfirmAlert('Success', 'Category updated', dismissAlert);
    } catch (err) {
      logError('Failed to update category:', { error: err });
      showErrorAlert('Error', 'Failed to update category');
    }
  };

  const handleDeleteCategory = (category: Category) => {
    showConfirmAlert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This will also delete all subcategories. If transactions still use this category, deletion may fail until those entries are reassigned.`,
      async () => {
        try {
          await deleteCategory(category.id!);
          log(`Deleted category: ${category.name}`);
          loadCategories();
          showSuccessAlert('Success', 'Category deleted', dismissAlert);
        } catch (err) {
          logError('Failed to delete category:', { error: err });
          showErrorAlert('Error', 'Failed to delete category. It may still be used by existing transactions.');
        }
      }
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
      <View style={StyleSheet.flatten([styles.categoryItem, { backgroundColor: colors.card }]) as any}>
        <View style={styles.categoryContent}>
          <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: colors.primary }]) as any}>
            {renderCategoryIcon(category.icon, category.name, category.type, 20, '#FFFFFF')}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={StyleSheet.flatten([styles.categoryName, { color: colors.textPrimary }]) as any}>
              {category.name}
            </Text>
            {category.children && category.children.length > 0 && (
              <Text style={StyleSheet.flatten([styles.subcategoryCount, { color: colors.textSecondary }]) as any}>
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
            <Text style={StyleSheet.flatten([styles.actionText, { color: colors.primary }]) as any}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeleteCategory(category)}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={StyleSheet.flatten([styles.actionText, { color: colors.danger }]) as any}>Delete</Text>
          </Pressable>
        </View>
      </View>

      {/* Subcategories */}
      {category.children && category.children.map((child) => (
        <View key={child.id} style={StyleSheet.flatten([styles.subcategoryItem, { backgroundColor: colors.card }]) as any}>
          <View style={styles.categoryContent}>
            <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: colors.primary, marginLeft: 24, width: 32, height: 32 }]) as any}>
              {renderCategoryIcon(child.icon, child.name, child.type, 16, '#FFFFFF')}
            </View>
            <Text style={StyleSheet.flatten([styles.subcategoryName, { color: colors.textSecondary }]) as any}>
              {child.name}
            </Text>
          </View>
          <View style={styles.categoryActions}>
            <Pressable
              onPress={() => handleEditCategory(child)}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={StyleSheet.flatten([styles.actionText, { color: colors.primary }]) as any}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeleteCategory(child)}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={StyleSheet.flatten([styles.actionText, { color: colors.danger }]) as any}>Delete</Text>
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
        style={StyleSheet.flatten([styles.addSubcategoryButton, { borderColor: colors.primary }]) as any}
      >
        <Text style={StyleSheet.flatten([styles.addSubcategoryText, { color: colors.primary }]) as any}>
          + Add Subcategory
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
      {/* Type Selector */}
      <View style={StyleSheet.flatten([styles.typeSelector, { backgroundColor: colors.card, borderBottomColor: colors.border }]) as any}>
        <Pressable
          onPress={() => setCategoryType('expense')}
          style={StyleSheet.flatten([
            styles.typeButton,
            categoryType === 'expense' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]) as any}
        >
          <Text
            style={StyleSheet.flatten([
              styles.typeButtonText,
              { color: categoryType === 'expense' ? colors.primary : colors.textSecondary },
            ]) as any}
          >
            Expense
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCategoryType('income')}
          style={StyleSheet.flatten([
            styles.typeButton,
            categoryType === 'income' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]) as any}
        >
          <Text
            style={StyleSheet.flatten([
              styles.typeButtonText,
              { color: categoryType === 'income' ? colors.primary : colors.textSecondary },
            ]) as any}
          >
            Income
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }]) as any}>Loading...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }]) as any}>No categories</Text>
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
        style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.primary }]) as any}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
        <View style={StyleSheet.flatten([styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]) as any}> 
          <View style={StyleSheet.flatten([styles.modalContent, { backgroundColor: colors.background }]) as any}> 
            <View style={StyleSheet.flatten([styles.modalHeader, { borderBottomColor: colors.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.modalTitle, { color: colors.textPrimary }]) as any}>
                {isCreatingSubcategory
                  ? `Add Subcategory under ${selectedParent?.name}`
                  : 'Create Category'}
              </Text>
              <Pressable onPress={() => setCreateModalVisible(false)}>
                <Text style={StyleSheet.flatten([styles.closeButton, { color: colors.textSecondary }]) as any}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formFields}>
              <Text style={StyleSheet.flatten([styles.label, { color: colors.textPrimary }]) as any}>Icon</Text>
              <TextInput
                style={StyleSheet.flatten([styles.iconInput, { color: colors.textPrimary, borderColor: colors.border }]) as any}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text.slice(0, 2) })}
                maxLength={2}
                placeholder="📊"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={StyleSheet.flatten([styles.label, { color: colors.textPrimary }]) as any}>Name</Text>
              <TextInput
                style={StyleSheet.flatten([styles.input, { color: colors.textPrimary, borderColor: colors.border }]) as any}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Category name"
                placeholderTextColor={colors.textSecondary}
              />

              <Pressable
                onPress={handleCreateCategory}
                style={StyleSheet.flatten([styles.submitButton, { backgroundColor: colors.primary }]) as any}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </Pressable>

              <Pressable
                onPress={() => setCreateModalVisible(false)}
                style={StyleSheet.flatten([styles.cancelButton, { borderColor: colors.border }]) as any}
              >
                <Text style={StyleSheet.flatten([styles.cancelButtonText, { color: colors.textSecondary }]) as any}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
        <View style={StyleSheet.flatten([styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]) as any}> 
          <View style={StyleSheet.flatten([styles.modalContent, { backgroundColor: colors.background }]) as any}> 
            <View style={StyleSheet.flatten([styles.modalHeader, { borderBottomColor: colors.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.modalTitle, { color: colors.textPrimary }]) as any}>Edit Category</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Text style={StyleSheet.flatten([styles.closeButton, { color: colors.textSecondary }]) as any}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formFields}>
              <Text style={StyleSheet.flatten([styles.label, { color: colors.textPrimary }]) as any}>Icon</Text>
              <TextInput
                style={StyleSheet.flatten([styles.iconInput, { color: colors.textPrimary, borderColor: colors.border }]) as any}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text.slice(0, 2) })}
                maxLength={2}
                placeholder="📊"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={StyleSheet.flatten([styles.label, { color: colors.textPrimary }]) as any}>Name</Text>
              <TextInput
                style={StyleSheet.flatten([styles.input, { color: colors.textPrimary, borderColor: colors.border }]) as any}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Category name"
                placeholderTextColor={colors.textSecondary}
              />

              <Pressable
                onPress={handleUpdateCategory}
                style={StyleSheet.flatten([styles.submitButton, { backgroundColor: colors.primary }]) as any}
              >
                <Text style={styles.submitButtonText}>Update</Text>
              </Pressable>

              <Pressable
                onPress={() => setEditModalVisible(false)}
                style={StyleSheet.flatten([styles.cancelButton, { borderColor: colors.border }]) as any}
              >
                <Text style={StyleSheet.flatten([styles.cancelButtonText, { color: colors.textSecondary }]) as any}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Themed Alert Component */}
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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

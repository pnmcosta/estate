mkdir -p .bundle/themes/admin/

cd .bundle
cp -a ../components/ components
cp -a ../definitions/ definitions
cp -a ../schemas/ schemas
cp -a ../themes/admin/* themes/admin
cp -a ../resources/ resources

# create package without theme
tpm create estate.package
cp estate.package ../estate.bundle

cd ..
rm -rf .bundle
echo "DONE"